import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { type TokenInfo, getValidTokenForAdAccount } from '@/lib/facebook/token-helper';
import { decryptToken } from '@/lib/services/metaClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const adAccountIdParam = searchParams.get('adAccountId');
    const pageId = searchParams.get('pageId');

    if (!adAccountIdParam) {
      return NextResponse.json({ error: 'Ad Account ID is required' }, { status: 400 });
    }

    const cleanId = adAccountIdParam.replace(/^act_/, '');
    const actId = `act_${cleanId}`;

    console.log(`🔍 Fetching beneficiaries for ad account: ${actId}`);
    if (pageId) console.log(`📄 Page ID provided: ${pageId}`);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        metaAccount: { select: { accessToken: true } },
        accounts: { where: { provider: 'facebook' }, select: { access_token: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tokens: TokenInfo[] = [];
    if ((user as any).metaAccount?.accessToken) {
      try {
        const decrypted = decryptToken((user as any).metaAccount.accessToken);
        tokens.push({ token: decrypted, name: user.name || 'Main Account' });
      } catch {
        tokens.push({ token: (user as any).metaAccount.accessToken, name: user.name || 'Main Account (raw)' });
      }
    }
    (user as any).accounts?.forEach((acc: { access_token: string | null }) => {
      if (acc.access_token && !tokens.some((t) => t.token === acc.access_token)) {
        tokens.push({ token: acc.access_token, name: user.name || 'Account' });
      }
    });

    const memberRecord = await prisma.teamMember.findFirst({
      where: { memberEmail: session.user.email },
    });
    let teamOwnerId = user.id;
    if (memberRecord?.userId) teamOwnerId = memberRecord.userId;

    const teamOwner = await prisma.user.findUnique({
      where: { id: teamOwnerId },
      include: {
        metaAccount: { select: { accessToken: true } },
        accounts: { where: { provider: 'facebook' }, select: { access_token: true } },
      },
    });
    if (teamOwner?.metaAccount?.accessToken && teamOwnerId !== user.id) {
      try {
        const decrypted = decryptToken(teamOwner.metaAccount.accessToken);
        if (!tokens.some((t) => t.token === decrypted)) {
          tokens.push({ token: decrypted, name: teamOwner.name || 'Team Owner' });
        }
      } catch {
        /* ignore */
      }
    }
    teamOwner?.accounts?.forEach((acc: { access_token: string | null }) => {
      if (acc.access_token && !tokens.some((t) => t.token === acc.access_token)) {
        tokens.push({ token: acc.access_token, name: (teamOwner?.name ?? 'Team Owner') + ' Account' });
      }
    });

    const teamMembers = await prisma.teamMember.findMany({
      where: { userId: teamOwnerId, memberType: 'facebook', facebookUserId: { not: null }, accessToken: { not: null } },
    });
    teamMembers.forEach((m: { accessToken: string | null; facebookName: string | null }) => {
      if (m.accessToken && !tokens.some((t) => t.token === m.accessToken)) {
        tokens.push({ token: m.accessToken, name: m.facebookName || 'Team Member' });
      }
    });

    const sessionToken = (session as { accessToken?: string }).accessToken;
    if (sessionToken && !tokens.some((t) => t.token === sessionToken)) {
      tokens.push({ token: sessionToken, name: 'Session' });
    }

    if (tokens.length === 0) {
      return NextResponse.json({ error: 'Facebook not connected', beneficiaries: [] }, { status: 400 });
    }

    const accessToken = await getValidTokenForAdAccount(actId, tokens);
    if (!accessToken) {
      return NextResponse.json({
        error: 'No valid token for this ad account. Check Settings > Connections.',
        beneficiaries: [],
      }, { status: 400 });
    }

    const beneficiaries: Array<{ id: string; name: string }> = [];
    let adAccountData: { business?: { id: string }; default_dsa_beneficiary?: string; dsa_beneficiary?: string } | null = null;

    try {
      // Fetch ad account + ad sets + dsa_recommendations in parallel (all independent)
      const [adAccountResponse, adSetsRes, recRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v22.0/${actId}?fields=id,name,account_id,business,funding_source_details,default_dsa_beneficiary,default_dsa_payor,dsa_beneficiary,dsa_payor&access_token=${accessToken}`),
        fetch(`https://graph.facebook.com/v22.0/${actId}/adsets?fields=id,name,regional_regulation_identities&limit=100&access_token=${accessToken}`),
        fetch(`https://graph.facebook.com/v22.0/${actId}/dsa_recommendations?fields=recommendations&access_token=${accessToken}`),
      ]);

      // ========== METHOD 3: Ad Account Settings (DSA beneficiary/payor) ==========
      try {
        adAccountData = await adAccountResponse.json();
        console.log('💼 Ad Account Data:', JSON.stringify(adAccountData, null, 2));

        if (adAccountData?.default_dsa_beneficiary) {
          const v = String(adAccountData.default_dsa_beneficiary);
          beneficiaries.push({ id: v, name: /^\d+$/.test(v) ? `ID ${v}` : v });
          console.log(`✅ Method 3: default_dsa_beneficiary ${v}`);
        }

        if (adAccountData?.dsa_beneficiary) {
          const v = String(adAccountData.dsa_beneficiary);
          if (!beneficiaries.some((b) => b.id === v)) {
            beneficiaries.push({ id: v, name: /^\d+$/.test(v) ? `ID ${v}` : v });
            console.log(`✅ Method 3: dsa_beneficiary ${v}`);
          }
        }

        // ========== METHOD 3c: DSA Recommendations (already fetched in parallel above) ==========
        try {
          const recData = await recRes.json();
          if (recData.error) {
            console.log('❌ dsa_recommendations error:', recData.error?.message);
          } else {
            const list: string[] = [];
            if (Array.isArray(recData.recommendations)) {
              list.push(...recData.recommendations);
            }
            if (Array.isArray(recData.data)) {
              for (const node of recData.data) {
                const arr = node?.recommendations;
                if (Array.isArray(arr)) list.push(...arr);
                else if (typeof node === 'string') list.push(node);
                else if (node?.beneficiary != null) list.push(String(node.beneficiary));
                else if (node?.id != null) list.push(String(node.id));
              }
            }
            for (const raw of list) {
              const s = (typeof raw === 'string' ? raw : String(raw ?? '')).trim();
              if (!s || beneficiaries.some((b) => b.id === s)) continue;
              beneficiaries.push({
                id: s,
                name: /^\d+$/.test(s) ? `ID ${s}` : s
              });
              console.log(`✅ Method 3c: dsa_recommendation ${s}`);
            }
          }
        } catch (e: any) {
          console.log('❌ dsa_recommendations failed:', e?.message);
        }

        // Method 3b (Business / primary_page) skipped – those are portfolio names, not verified-identity list.
      } catch (error: any) {
        console.log('❌ Ad Account check failed:', error.message);
      }

      // ========== METHOD 4: Ad Sets (already fetched in parallel above) ==========
      const seenIds = new Set(beneficiaries.map((b) => b.id));
      try {
        const adSetsJson = await adSetsRes.json();
        const adSets = adSetsJson.data ?? [];
        console.log(`📊 Found ${adSets.length} ad sets`);

        for (const adSet of adSets) {
          const r = adSet.regional_regulation_identities;
          if (!r) continue;
          const vals = [r.universal_beneficiary, r.universal_payer].filter(Boolean).map(String);
          for (const v of vals) {
            const id = v.trim();
            if (!id || seenIds.has(id)) continue;
            seenIds.add(id);
            beneficiaries.push({
              id,
              name: /^\d+$/.test(id) ? `ID ${id}` : id
            });
            console.log(`  ✅ AdSet beneficiary: ${id}`);
          }
        }
      } catch (error: any) {
        console.log('❌ Ad Sets check failed:', error.message);
      }

      // ไม่ใช้ fallback (Page, Business, promote_pages, me/accounts) ใน dropdown — จะแสดงเฉพาะผู้รับผลประโยชน์แบบยืนยันตัวตน (DSA, Ad Set).
      // ไม่ใส่ชื่อเพจ/ธุรกิจ. ตอนสร้างแคมเปญยังใช้ getVerifiedBeneficiary fallback ฝั่ง create ได้.

    } catch (error: any) {
      console.error('❌ Error fetching beneficiaries:', error);
      console.error('Error details:', error.message);
    }

    // Remove duplicates by ID; prefer numeric IDs (valid for universal_beneficiary)
    const byId = new Map<string, { id: string; name: string }>();
    for (const b of beneficiaries) {
      const id = String(b.id).trim();
      if (id && !byId.has(id)) byId.set(id, { id, name: b.name });
    }
    let unique = Array.from(byId.values());
    const numericFirst = (a: { id: string }, b: { id: string }) => {
      const aNum = /^\d+$/.test(a.id) ? 0 : 1;
      const bNum = /^\d+$/.test(b.id) ? 0 : 1;
      if (aNum !== bNum) return aNum - bNum;
      return a.id.localeCompare(b.id);
    };
    unique.sort(numericFirst);

    // Display like Meta: "ชื่อ (ID: xxx)". Resolve all numeric IDs then set name.
    const numericIds = unique.filter((u) => /^\d+$/.test(u.id)).map((u) => u.id);
    const chunk = numericIds.slice(0, 50);
    if (chunk.length > 0) {
      try {
        const r = await fetch(
          `https://graph.facebook.com/v22.0/?ids=${encodeURIComponent(chunk.join(','))}&fields=name&access_token=${accessToken}`
        );
        const data = (await r.json()) as Record<string, { name?: string; error?: { message: string } }>;
        for (const id of chunk) {
          const u = unique.find((x) => x.id === id);
          if (!u) continue;
          const node = data[id];
          const n = node && !node.error && typeof node.name === 'string' ? node.name.trim() : null;
          u.name = n ? `${n} (ID: ${id})` : `— (ID: ${id})`;
          if (n) console.log(`📌 Resolved beneficiary ${id} → ${n}`);
        }
      } catch (e: any) {
        console.log('⚠️ Resolve names failed:', e?.message);
        for (const id of chunk) {
          const u = unique.find((x) => x.id === id);
          if (u) u.name = `— (ID: ${id})`;
        }
      }
    }
    for (const u of unique) {
      if (!/^\d+$/.test(u.id)) continue;
      if (!u.name.includes(' (ID: ')) u.name = `— (ID: ${u.id})`;
    }
    // Non-numeric: use name as-is (no " (ID: ...)" suffix).
    for (const u of unique) {
      if (/^\d+$/.test(u.id)) continue;
      const cleaned = u.name
        .replace(/\s*\(Default DSA\)\s*$/i, '')
        .replace(/\s*\(DSA\)\s*$/i, '')
        .replace(/\s*\(DSA แนะนำ\)\s*$/i, '')
        .replace(/\s*\(จาก Ad Set\)\s*$/i, '')
        .trim();
      u.name = cleaned || u.id;
    }

    console.log(`📋 Total unique beneficiaries: ${unique.length}`);

    return NextResponse.json({
      beneficiaries: unique,
      count: unique.length
    });

  } catch (error: any) {
    console.error('Beneficiaries API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch beneficiaries' },
      { status: 500 }
    );
  }
}
