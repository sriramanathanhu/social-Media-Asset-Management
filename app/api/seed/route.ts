import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/utils/encryption";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, adminKey } = body;

    // Simple protection - check for environment variable
    const expectedKey = process.env.BOOTSTRAP_KEY || "bootstrap_setup_2024";
    if (adminKey !== expectedKey) {
      return Response.json({
        error: "Invalid admin key"
      }, { status: 401 });
    }

    if (action === "seed_data") {
      // Create dummy ecosystems
      const ecosystems = await Promise.all([
        prisma.ecosystem.upsert({
          where: { name: "Tech Startup Hub" },
          update: {},
          create: {
            name: "Tech Startup Hub",
            theme: "technology",
            description: "Ecosystem for technology startups and innovation companies",
            active_status: true
          }
        }),
        prisma.ecosystem.upsert({
          where: { name: "Health & Wellness Network" },
          update: {},
          create: {
            name: "Health & Wellness Network",
            theme: "health",
            description: "Ecosystem for healthcare, fitness, and wellness organizations",
            active_status: true
          }
        }),
        prisma.ecosystem.upsert({
          where: { name: "Creative Arts Collective" },
          update: {},
          create: {
            name: "Creative Arts Collective",
            theme: "arts",
            description: "Ecosystem for artists, designers, and creative professionals",
            active_status: true
          }
        })
      ]);

      // Create dummy users
      const users = await Promise.all([
        prisma.user.upsert({
          where: { email: "john.doe@techstartup.com" },
          update: {},
          create: {
            email: "john.doe@techstartup.com",
            name: "John Doe",
            ecitizen_id: "TC001",
            role: "user"
          }
        }),
        prisma.user.upsert({
          where: { email: "sarah.manager@healthnet.com" },
          update: {},
          create: {
            email: "sarah.manager@healthnet.com",
            name: "Sarah Manager",
            ecitizen_id: "HW002",
            role: "user"
          }
        }),
        prisma.user.upsert({
          where: { email: "alex.creative@artscollective.com" },
          update: {},
          create: {
            email: "alex.creative@artscollective.com",
            name: "Alex Creative",
            ecitizen_id: "AC003",
            role: "user"
          }
        })
      ]);

      // Create user-ecosystem assignments
      const assignments = await Promise.all([
        prisma.userEcosystem.upsert({
          where: { 
            user_id_ecosystem_id: { 
              user_id: users[0].id, 
              ecosystem_id: ecosystems[0].id 
            } 
          },
          update: {},
          create: {
            user_id: users[0].id,
            ecosystem_id: ecosystems[0].id
          }
        }),
        prisma.userEcosystem.upsert({
          where: { 
            user_id_ecosystem_id: { 
              user_id: users[1].id, 
              ecosystem_id: ecosystems[1].id 
            } 
          },
          update: {},
          create: {
            user_id: users[1].id,
            ecosystem_id: ecosystems[1].id
          }
        }),
        prisma.userEcosystem.upsert({
          where: { 
            user_id_ecosystem_id: { 
              user_id: users[2].id, 
              ecosystem_id: ecosystems[2].id 
            } 
          },
          update: {},
          create: {
            user_id: users[2].id,
            ecosystem_id: ecosystems[2].id
          }
        })
      ]);

      // Create dummy platforms
      const platforms = await Promise.all([
        // Tech Startup Hub platforms
        prisma.socialMediaPlatform.upsert({
          where: { 
            ecosystem_id_platform_name: { 
              ecosystem_id: ecosystems[0].id, 
              platform_name: "TechStartup_Official" 
            } 
          },
          update: {},
          create: {
            ecosystem_id: ecosystems[0].id,
            platform_name: "TechStartup_Official",
            platform_type: "Twitter",
            profile_url: "https://twitter.com/techstartup_official",
            profile_id: "@techstartup_official",
            username: encrypt("techstartup_official"),
            password: encrypt("DemoPassword123!"),
            bio: "Official account for Tech Startup Hub - Innovation & Technology",
            account_status: "active",
            verification_status: "verified",
            followers_count: 15420,
            following_count: 892,
            posts_count: 1247
          }
        }),
        prisma.socialMediaPlatform.upsert({
          where: { 
            ecosystem_id_platform_name: { 
              ecosystem_id: ecosystems[0].id, 
              platform_name: "TechStartup_LinkedIn" 
            } 
          },
          update: {},
          create: {
            ecosystem_id: ecosystems[0].id,
            platform_name: "TechStartup_LinkedIn",
            platform_type: "LinkedIn",
            profile_url: "https://linkedin.com/company/tech-startup-hub",
            profile_id: "tech-startup-hub",
            username: encrypt("techstartup@company.com"),
            password: encrypt("DemoPassword123!"),
            bio: "Leading innovation in technology startups. Connect with entrepreneurs and innovators.",
            account_status: "active",
            verification_status: "verified",
            followers_count: 8934,
            following_count: 245,
            posts_count: 567
          }
        }),
        
        // Health & Wellness Network platforms
        prisma.socialMediaPlatform.upsert({
          where: { 
            ecosystem_id_platform_name: { 
              ecosystem_id: ecosystems[1].id, 
              platform_name: "HealthWellness_Instagram" 
            } 
          },
          update: {},
          create: {
            ecosystem_id: ecosystems[1].id,
            platform_name: "HealthWellness_Instagram",
            platform_type: "Instagram",
            profile_url: "https://instagram.com/healthwellnessnetwork",
            profile_id: "@healthwellnessnetwork",
            username: encrypt("healthwellnessnetwork"),
            password: encrypt("WellnessDemo2024!"),
            bio: "🌱 Health & Wellness Community | 💪 Fitness Tips | 🧘 Mental Health Support",
            account_status: "active",
            verification_status: "verified",
            followers_count: 23567,
            following_count: 1834,
            posts_count: 2891
          }
        }),
        prisma.socialMediaPlatform.upsert({
          where: { 
            ecosystem_id_platform_name: { 
              ecosystem_id: ecosystems[1].id, 
              platform_name: "HealthWellness_YouTube" 
            } 
          },
          update: {},
          create: {
            ecosystem_id: ecosystems[1].id,
            platform_name: "HealthWellness_YouTube",
            platform_type: "YouTube",
            profile_url: "https://youtube.com/c/healthwellnessnetwork",
            profile_id: "healthwellnessnetwork",
            username: encrypt("healthwellness@network.com"),
            password: encrypt("WellnessDemo2024!"),
            bio: "Your trusted source for health and wellness content. Weekly videos on fitness, nutrition, and mental health.",
            account_status: "active",
            verification_status: "unverified",
            followers_count: 12890,
            following_count: 156,
            posts_count: 234
          }
        }),

        // Creative Arts Collective platforms
        prisma.socialMediaPlatform.upsert({
          where: { 
            ecosystem_id_platform_name: { 
              ecosystem_id: ecosystems[2].id, 
              platform_name: "CreativeArts_Behance" 
            } 
          },
          update: {},
          create: {
            ecosystem_id: ecosystems[2].id,
            platform_name: "CreativeArts_Behance",
            platform_type: "Behance",
            profile_url: "https://behance.net/creativeartscollective",
            profile_id: "creativeartscollective",
            username: encrypt("creative.arts.collective"),
            password: encrypt("CreativeDemo2024!"),
            bio: "Showcasing amazing creative work from our talented community of artists and designers.",
            account_status: "active",
            verification_status: "verified",
            followers_count: 7845,
            following_count: 2341,
            posts_count: 1893
          }
        }),
        prisma.socialMediaPlatform.upsert({
          where: { 
            ecosystem_id_platform_name: { 
              ecosystem_id: ecosystems[2].id, 
              platform_name: "CreativeArts_TikTok" 
            } 
          },
          update: {},
          create: {
            ecosystem_id: ecosystems[2].id,
            platform_name: "CreativeArts_TikTok",
            platform_type: "TikTok",
            profile_url: "https://tiktok.com/@creativeartscollective",
            profile_id: "@creativeartscollective",
            username: encrypt("creativeartscollective"),
            password: encrypt("CreativeDemo2024!"),
            bio: "🎨 Art tutorials | ✨ Creative process | 🖌️ Artist spotlights | Daily creativity",
            account_status: "active",
            verification_status: "unverified",
            followers_count: 45690,
            following_count: 1567,
            posts_count: 3245,
            totp_enabled: true
          }
        })
      ]);

      return Response.json({
        message: "Dummy data created successfully",
        summary: {
          ecosystems: ecosystems.length,
          users: users.length,
          assignments: assignments.length,
          platforms: platforms.length
        },
        data: {
          ecosystems: ecosystems.map(e => ({ id: e.id, name: e.name, theme: e.theme })),
          users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
          platforms: platforms.map(p => ({ id: p.id, name: p.platform_name, type: p.platform_type, ecosystem: p.ecosystem_id }))
        }
      });
    }

    if (action === "clear_data") {
      // Clear all data (be careful!)
      await prisma.credentialHistory.deleteMany();
      await prisma.socialMediaPlatform.deleteMany();
      await prisma.userEcosystem.deleteMany();
      await prisma.ecosystem.deleteMany();
      // Don't delete users as they might be needed for authentication

      return Response.json({
        message: "All data cleared (except users for authentication)"
      });
    }

    return Response.json({
      error: "Invalid action. Use 'seed_data' or 'clear_data'"
    }, { status: 400 });

  } catch (error) {
    console.error("Seed error:", error);
    return Response.json({
      error: "Failed to seed data",
      details: error.message
    }, { status: 500 });
  }
}