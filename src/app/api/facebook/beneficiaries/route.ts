import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const adAccountId = searchParams.get('adAccountId');
    const pageId = searchParams.get('pageId'); // Optional: if page is selected

    if (!adAccountId) {
      return NextResponse.json({ error: 'Ad Account ID is required' }, { status: 400 });
    }

    console.log(`🔍 Fetching beneficiaries for ad account: ${adAccountId}`);
    if (pageId) {
      console.log(`📄 Page ID provided: ${pageId}`);
    }

    const accessToken = (session as any).accessToken;
    const beneficiaries: Array<{ id: string; name: string }> = [];

    try {
      // ========== METHOD 1: Check Page Transparency (if pageId provided) ==========
      if (pageId) {
        console.log('🔍 Method 1: Checking Page Transparency...');
        try {
          const pageTransparencyResponse = await fetch(
            `https://graph.facebook.com/v22.0/${pageId}?fields=id,name,page_transparency_label,legal_entity_name,about,category,verification_status&access_token=${accessToken}`
          );
          const pageTransparency = await pageTransparencyResponse.json();
          console.log('📄 Page Transparency Data:', JSON.stringify(pageTransparency, null, 2));
          
          if (pageTransparency.legal_entity_name) {
            beneficiaries.push({
              id: pageTransparency.legal_entity_name,
              name: `${pageTransparency.legal_entity_name} (Page Legal Entity)`
            });
            console.log(`✅ Found legal_entity_name: ${pageTransparency.legal_entity_name}`);
          }
        } catch (error: any) {
          console.log('❌ Page transparency check failed:', error.message);
        }

        // Check Page Settings endpoint
        console.log('🔍 Method 1b: Checking Page Settings...');
        try {
          const pageSettingsResponse = await fetch(
            `https://graph.facebook.com/v22.0/${pageId}/settings?access_token=${accessToken}`
          );
          const pageSettings = await pageSettingsResponse.json();
          console.log('⚙️ Page Settings:', JSON.stringify(pageSettings, null, 2));
        } catch (error: any) {
          console.log('❌ Page settings check failed:', error.message);
        }
      }

      // ========== METHOD 2: Check all accessible Pages ==========
      console.log('🔍 Method 2: Checking all accessible Pages...');
      try {
        const pagesResponse = await fetch(
          `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,page_transparency_label,legal_entity_name&limit=50&access_token=${accessToken}`
        );
        const pagesData = await pagesResponse.json();
        console.log(`📄 Found ${pagesData.data?.length || 0} pages`);
        
        if (pagesData.data) {
          for (const page of pagesData.data) {
            console.log(`\n📄 Page: ${page.name} (${page.id})`);
            if (page.legal_entity_name) {
              beneficiaries.push({
                id: page.legal_entity_name,
                name: `${page.legal_entity_name} (${page.name})`
              });
              console.log(`  ✅ Legal entity: ${page.legal_entity_name}`);
            }
            if (page.page_transparency_label) {
              console.log(`  📋 Transparency label:`, JSON.stringify(page.page_transparency_label, null, 2));
            }
          }
        }
      } catch (error: any) {
        console.log('❌ Pages check failed:', error.message);
      }

      // ========== METHOD 3: Check Ad Account Settings ==========
      console.log('\n🔍 Method 3: Checking Ad Account Settings...');
      try {
        const adAccountResponse = await fetch(
          `https://graph.facebook.com/v22.0/act_${adAccountId}?fields=id,name,account_id,business,funding_source_details,default_dsa_beneficiary,default_dsa_payor,dsa_beneficiary,dsa_payor&access_token=${accessToken}`
        );
        const adAccountData = await adAccountResponse.json();
        console.log('💼 Ad Account Data:', JSON.stringify(adAccountData, null, 2));
        
        if (adAccountData.default_dsa_beneficiary) {
          beneficiaries.push({
            id: adAccountData.default_dsa_beneficiary,
            name: `${adAccountData.default_dsa_beneficiary} (Default DSA)`
          });
          console.log(`✅ default_dsa_beneficiary: ${adAccountData.default_dsa_beneficiary}`);
        }
        
        if (adAccountData.dsa_beneficiary) {
          beneficiaries.push({
            id: adAccountData.dsa_beneficiary,
            name: `${adAccountData.dsa_beneficiary} (DSA)`
          });
          console.log(`✅ dsa_beneficiary: ${adAccountData.dsa_beneficiary}`);
        }

        // Check Business if available
        if (adAccountData.business?.id) {
          console.log('\n🔍 Method 3b: Checking Business Info...');
          try {
            const businessResponse = await fetch(
              `https://graph.facebook.com/v22.0/${adAccountData.business.id}?fields=id,name,legal_entity_name,verification_status,verified_business_info,primary_page&access_token=${accessToken}`
            );
            const businessData = await businessResponse.json();
            console.log('🏢 Business Data:', JSON.stringify(businessData, null, 2));
            
            if (businessData.legal_entity_name) {
              beneficiaries.push({
                id: businessData.legal_entity_name,
                name: `${businessData.legal_entity_name} (Business)`
              });
              console.log(`✅ Business legal_entity_name: ${businessData.legal_entity_name}`);
            }
          } catch (error: any) {
            console.log('❌ Business check failed:', error.message);
          }
        }
      } catch (error: any) {
        console.log('❌ Ad Account check failed:', error.message);
      }

      // ========== METHOD 4: Check existing Campaigns/AdSets ==========
      console.log('\n🔍 Method 4: Checking existing Campaigns/AdSets...');
      try {
        const campaignsResponse = await fetch(
          `https://graph.facebook.com/v22.0/act_${adAccountId}/campaigns?fields=id,name&limit=5&access_token=${accessToken}`
        );
        const campaignsData = await campaignsResponse.json();
        console.log(`📊 Found ${campaignsData.data?.length || 0} campaigns`);
        
        if (campaignsData.data && campaignsData.data.length > 0) {
          for (const campaign of campaignsData.data) {
            console.log(`\n📊 Campaign: ${campaign.name}`);
            
            const adSetsResponse = await fetch(
              `https://graph.facebook.com/v22.0/${campaign.id}/adsets?fields=id,name,regional_regulation_identities,regional_regulated_categories&limit=1&access_token=${accessToken}`
            );
            const adSetsData = await adSetsResponse.json();
            
            if (adSetsData.data && adSetsData.data[0]) {
              const adSet = adSetsData.data[0];
              console.log(`  📋 AdSet:`, JSON.stringify(adSet, null, 2));
              
              if (adSet.regional_regulation_identities?.universal_beneficiary) {
                const beneficiaryValue = adSet.regional_regulation_identities.universal_beneficiary;
                beneficiaries.push({
                  id: beneficiaryValue,
                  name: `${beneficiaryValue} (From Existing AdSet)`
                });
                console.log(`  ✅ Found beneficiary from AdSet: ${beneficiaryValue}`);
                break; // Found one, no need to continue
              }
            }
          }
        }
      } catch (error: any) {
        console.log('❌ Campaigns check failed:', error.message);
      }

      // ========== METHOD 5: Check User's Businesses ==========
      console.log('\n🔍 Method 5: Checking User Businesses...');
      try {
        const meResponse = await fetch(
          `https://graph.facebook.com/v22.0/me?fields=id,name,businesses{id,name,legal_entity_name,verification_status}&access_token=${accessToken}`
        );
        const meData = await meResponse.json();
        console.log('👤 User Businesses:', JSON.stringify(meData.businesses, null, 2));
        
        if (meData.businesses?.data) {
          for (const business of meData.businesses.data) {
            if (business.legal_entity_name) {
              beneficiaries.push({
                id: business.legal_entity_name,
                name: `${business.legal_entity_name} (${business.name})`
              });
              console.log(`✅ Business legal entity: ${business.legal_entity_name}`);
            }
          }
        }
      } catch (error: any) {
        console.log('❌ User businesses check failed:', error.message);
      }

    } catch (error: any) {
      console.error('❌ Error fetching beneficiaries:', error);
      console.error('Error details:', error.message);
    }

    // Remove duplicates by ID
    const uniqueBeneficiaries = Array.from(
      new Map(beneficiaries.map(b => [b.id, b])).values()
    );

    console.log(`📋 Total unique beneficiaries found: ${uniqueBeneficiaries.length}`);

    return NextResponse.json({ 
      beneficiaries: uniqueBeneficiaries,
      count: uniqueBeneficiaries.length
    });

  } catch (error: any) {
    console.error('Beneficiaries API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch beneficiaries' },
      { status: 500 }
    );
  }
}
