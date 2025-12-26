import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Facebook access token from session
    const accessToken = (session as any).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook not connected', pages: [] },
        { status: 400 }
      );
    }

    // Fetch ALL pages from Facebook Graph API with pagination support
    let pages: any[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,category,picture,tasks,is_published,fan_count,verification_status,page_token&limit=200&access_token=${accessToken}`;

    console.log('🔍 Starting to fetch pages from /me/accounts...');

    // Fetch all pages with pagination
    let pageCount = 0;
    while (nextUrl) {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount} from: ${nextUrl.substring(0, 100)}...`);

      const response: Response = await fetch(nextUrl);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Facebook API error:', errorData);
        break;
      }

      const data = await response.json();
      const pagesBatch = data.data || [];
      pages = pages.concat(pagesBatch);

      console.log(`✓ Fetched ${pagesBatch.length} pages in this batch`);

      // Log details of each page
      pagesBatch.forEach((page: any, index: number) => {
        console.log(`  Page ${index + 1}: ${page.name} (${page.id})`);
        console.log(`    Tasks: ${page.tasks ? page.tasks.join(', ') : 'none'}`);
      });

      console.log(`📊 Total pages so far: ${pages.length}`);
      console.log(`🔗 Has next page: ${!!data.paging?.next}`);

      // Check if there's a next page
      nextUrl = data.paging?.next || null;

      // Safety limit to prevent infinite loop
      if (pageCount > 10) {
        console.warn('⚠️ Reached safety limit of 10 requests');
        break;
      }
    }

    console.log(`✅ Finished fetching from /me/accounts: ${pages.length} pages total`);

    // Also try to fetch pages from business accounts
    try {
      const businessResponse = await fetch(
        `https://graph.facebook.com/v22.0/me/businesses?fields=id,name,owned_pages{id,name,access_token,category,picture,tasks,is_published,fan_count,verification_status,page_token},client_pages{id,name,access_token,category,picture,tasks,is_published,fan_count,verification_status,page_token}&access_token=${accessToken}`
      );

      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        console.log('Business data:', JSON.stringify(businessData, null, 2));

        // Extract pages from all businesses
        if (businessData.data && Array.isArray(businessData.data)) {
          for (const business of businessData.data) {
            // Add owned pages
            if (business.owned_pages?.data) {
              const ownedPages = business.owned_pages.data;
              console.log(`Found ${ownedPages.length} owned pages from business ${business.name}`);

              // Add only if not already in pages array
              for (const page of ownedPages) {
                if (!pages.find((p: any) => p.id === page.id)) {
                  pages.push(page);
                }
              }
            }

            // Add client pages
            if (business.client_pages?.data) {
              const clientPages = business.client_pages.data;
              console.log(`Found ${clientPages.length} client pages from business ${business.name}`);

              // Add only if not already in pages array
              for (const page of clientPages) {
                if (!pages.find((p: any) => p.id === page.id)) {
                  pages.push(page);
                }
              }
            }
          }
        }
      }
    } catch (businessError) {
      console.log('Could not fetch business pages (user may not have business_management permission):', businessError);
      // Continue with pages we already have
    }

    console.log(`Total ${pages.length} pages after merging all sources`);

    // If no pages found, log for debugging
    if (pages.length === 0) {
      console.log('No pages found. This could mean:');
      console.log('1. User is not an admin of any Facebook Pages');
      console.log('2. User did not grant pages_show_list permission');
      console.log('3. Token does not have correct permissions');
    }

    // Helper function to determine page status
    const getPageStatus = (page: any) => {
      // Check if page is unpublished
      if (page.is_published === false) {
        return 'UNPUBLISHED';
      }

      // Check if page has ADVERTISE task (can run ads)
      const canAdvertise = page.tasks?.includes('ADVERTISE');
      if (!canAdvertise) {
        return 'RESTRICTED';
      }

      return 'ACTIVE';
    };

    return NextResponse.json({
      pages: pages.map((page: any) => ({
        id: page.id,
        name: page.name,
        access_token: page.access_token,
        category: page.category,
        picture: page.picture?.data?.url,
        status: getPageStatus(page),
        is_published: page.is_published,
        can_advertise: page.tasks?.includes('ADVERTISE') || false,
      })),
      total: pages.length,
    });
  } catch (error) {
    console.error('Error fetching Facebook pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages', pages: [] },
      { status: 500 }
    );
  }
}
