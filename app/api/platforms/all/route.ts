import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await requireAuth();

    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = auth.user.role;
    const userId = auth.user.id;

    // Fetch all platforms with ecosystem and user relationships
    let platforms;

    if (userRole === 'admin') {
      // Admin can see all platforms
      platforms = await prisma.socialMediaPlatform.findMany({
        include: {
          ecosystem: {
            select: {
              id: true,
              name: true,
              theme: true,
            },
            include: {
              userEcosystems: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          platform_name: 'asc'
        }
      });
    } else {
      // Regular users can only see platforms from their assigned ecosystems
      const userEcosystems = await prisma.userEcosystem.findMany({
        where: {
          user_id: userId
        },
        select: {
          ecosystem_id: true
        }
      });

      const ecosystemIds = userEcosystems.map(ue => ue.ecosystem_id);

      platforms = await prisma.socialMediaPlatform.findMany({
        where: {
          ecosystem_id: {
            in: ecosystemIds
          }
        },
        include: {
          ecosystem: {
            select: {
              id: true,
              name: true,
              theme: true,
            },
            include: {
              userEcosystems: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          platform_name: 'asc'
        }
      });
    }

    // Transform the data to include users array at platform level
    const transformedPlatforms = platforms.map(platform => ({
      id: platform.id,
      platform_name: platform.platform_name,
      platform_type: platform.platform_type,
      login_method: platform.login_method,
      account_status: platform.account_status,
      profile_url: platform.profile_url,
      created_at: platform.created_at,
      ecosystem: {
        id: platform.ecosystem.id,
        name: platform.ecosystem.name,
        theme: platform.ecosystem.theme,
      },
      users: platform.ecosystem.userEcosystems.map(ue => ({
        id: ue.user.id,
        name: ue.user.name,
        email: ue.user.email,
      }))
    }));

    return NextResponse.json({
      success: true,
      platforms: transformedPlatforms
    });

  } catch (error) {
    console.error('Error fetching platforms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platforms' },
      { status: 500 }
    );
  }
}
