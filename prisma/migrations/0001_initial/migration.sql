-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ecitizen_id" TEXT,
    "role" TEXT NOT NULL DEFAULT 'read',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ecosystem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "description" TEXT,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ecosystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserEcosystem" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ecosystem_id" INTEGER NOT NULL,
    "assigned_by" INTEGER,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEcosystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SocialMediaPlatform" (
    "id" SERIAL NOT NULL,
    "ecosystem_id" INTEGER NOT NULL,
    "platform_name" TEXT NOT NULL,
    "platform_type" TEXT NOT NULL,
    "account_status" TEXT NOT NULL DEFAULT 'active',
    "login_method" TEXT NOT NULL DEFAULT 'email_password',
    "profile_url" TEXT,
    "profile_id" TEXT,
    "username" TEXT,
    "password" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "recovery_email" TEXT,
    "recovery_phone" TEXT,
    "two_fa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_secret" TEXT,
    "bio" TEXT,
    "profile_image_url" TEXT,
    "cover_image_url" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'unverified',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_checked" TIMESTAMP(3),
    "last_posted" TIMESTAMP(3),
    "followers_count" INTEGER,
    "following_count" INTEGER,
    "posts_count" INTEGER,
    "live_stream" TEXT,
    "language" TEXT,
    "status" TEXT,
    "recovery_phone_number" TEXT,
    "recovery_email_id" TEXT,
    "added_phone_number" TEXT,
    "phone_number_owner" TEXT,
    "branding" TEXT,
    "connection_tool" TEXT,

    CONSTRAINT "SocialMediaPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CredentialHistory" (
    "id" SERIAL NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "field_name" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailId" (
    "id" SERIAL NOT NULL,
    "email_address" TEXT NOT NULL,
    "ecosystem_name" TEXT,
    "primary_use" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailId_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformTemplate" (
    "id" SERIAL NOT NULL,
    "platform_name" TEXT NOT NULL,
    "platform_category" TEXT NOT NULL,
    "base_url" TEXT,
    "name_format" TEXT,
    "bio_format" TEXT,
    "url_format" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformAuditLog" (
    "id" SERIAL NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "field_name" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "user_id" INTEGER NOT NULL,
    "user_role" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformAccess" (
    "id" SERIAL NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "access_level" TEXT NOT NULL,
    "granted_by" INTEGER,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Resource" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'sop',
    "author_id" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailSettings" (
    "id" SERIAL NOT NULL,
    "sendgrid_api_key" TEXT,
    "from_email" TEXT,
    "from_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SecureLoginFolder" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#6366f1',
    "icon" TEXT DEFAULT 'folder',
    "parent_id" INTEGER,
    "owner_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecureLoginFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SecureLogin" (
    "id" SERIAL NOT NULL,
    "item_name" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "totp_secret" TEXT,
    "website_url" TEXT,
    "notes" TEXT,
    "login_type" TEXT NOT NULL DEFAULT 'email_password',
    "google_account_id" INTEGER,
    "folder_id" INTEGER,
    "owner_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecureLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SecureLoginGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecureLoginGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SecureLoginGroupMember" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "added_by" INTEGER,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecureLoginGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SecureLoginUserAccess" (
    "id" SERIAL NOT NULL,
    "secure_login_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "access_level" TEXT NOT NULL,
    "granted_by" INTEGER,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecureLoginUserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SecureLoginGroupAccess" (
    "id" SERIAL NOT NULL,
    "secure_login_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "access_level" TEXT NOT NULL,
    "granted_by" INTEGER,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecureLoginGroupAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SecureLoginHistory" (
    "id" SERIAL NOT NULL,
    "secure_login_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "field_name" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by" INTEGER NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecureLoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ecosystem_name_key" ON "public"."Ecosystem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserEcosystem_user_id_ecosystem_id_key" ON "public"."UserEcosystem"("user_id", "ecosystem_id");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaPlatform_ecosystem_id_platform_name_key" ON "public"."SocialMediaPlatform"("ecosystem_id", "platform_name");

-- CreateIndex
CREATE UNIQUE INDEX "EmailId_email_address_key" ON "public"."EmailId"("email_address");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformTemplate_platform_name_key" ON "public"."PlatformTemplate"("platform_name");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAccess_platform_id_user_id_access_level_key" ON "public"."PlatformAccess"("platform_id", "user_id", "access_level");

-- CreateIndex
CREATE UNIQUE INDEX "SecureLoginFolder_name_owner_id_parent_id_key" ON "public"."SecureLoginFolder"("name", "owner_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "SecureLoginGroup_name_owner_id_key" ON "public"."SecureLoginGroup"("name", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "SecureLoginGroupMember_group_id_user_id_key" ON "public"."SecureLoginGroupMember"("group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SecureLoginUserAccess_secure_login_id_user_id_key" ON "public"."SecureLoginUserAccess"("secure_login_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SecureLoginGroupAccess_secure_login_id_group_id_key" ON "public"."SecureLoginGroupAccess"("secure_login_id", "group_id");

-- AddForeignKey
ALTER TABLE "public"."UserEcosystem" ADD CONSTRAINT "UserEcosystem_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserEcosystem" ADD CONSTRAINT "UserEcosystem_ecosystem_id_fkey" FOREIGN KEY ("ecosystem_id") REFERENCES "public"."Ecosystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserEcosystem" ADD CONSTRAINT "UserEcosystem_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SocialMediaPlatform" ADD CONSTRAINT "SocialMediaPlatform_ecosystem_id_fkey" FOREIGN KEY ("ecosystem_id") REFERENCES "public"."Ecosystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CredentialHistory" ADD CONSTRAINT "CredentialHistory_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."SocialMediaPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CredentialHistory" ADD CONSTRAINT "CredentialHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."SocialMediaPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAccess" ADD CONSTRAINT "PlatformAccess_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "public"."SocialMediaPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAccess" ADD CONSTRAINT "PlatformAccess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAccess" ADD CONSTRAINT "PlatformAccess_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resource" ADD CONSTRAINT "Resource_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginFolder" ADD CONSTRAINT "SecureLoginFolder_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginFolder" ADD CONSTRAINT "SecureLoginFolder_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."SecureLoginFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLogin" ADD CONSTRAINT "SecureLogin_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLogin" ADD CONSTRAINT "SecureLogin_google_account_id_fkey" FOREIGN KEY ("google_account_id") REFERENCES "public"."EmailId"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLogin" ADD CONSTRAINT "SecureLogin_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."SecureLoginFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginGroup" ADD CONSTRAINT "SecureLoginGroup_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginGroupMember" ADD CONSTRAINT "SecureLoginGroupMember_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."SecureLoginGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginGroupMember" ADD CONSTRAINT "SecureLoginGroupMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginGroupMember" ADD CONSTRAINT "SecureLoginGroupMember_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginUserAccess" ADD CONSTRAINT "SecureLoginUserAccess_secure_login_id_fkey" FOREIGN KEY ("secure_login_id") REFERENCES "public"."SecureLogin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginUserAccess" ADD CONSTRAINT "SecureLoginUserAccess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginUserAccess" ADD CONSTRAINT "SecureLoginUserAccess_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginGroupAccess" ADD CONSTRAINT "SecureLoginGroupAccess_secure_login_id_fkey" FOREIGN KEY ("secure_login_id") REFERENCES "public"."SecureLogin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginGroupAccess" ADD CONSTRAINT "SecureLoginGroupAccess_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."SecureLoginGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginGroupAccess" ADD CONSTRAINT "SecureLoginGroupAccess_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginHistory" ADD CONSTRAINT "SecureLoginHistory_secure_login_id_fkey" FOREIGN KEY ("secure_login_id") REFERENCES "public"."SecureLogin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecureLoginHistory" ADD CONSTRAINT "SecureLoginHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

