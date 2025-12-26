-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` DATETIME(3) NULL,
    `password` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `facebookAdToken` TEXT NULL,
    `facebookName` VARCHAR(191) NULL,
    `googleRefreshToken` TEXT NULL,
    `googleEmail` VARCHAR(191) NULL,
    `googleName` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'host',
    `permissions` JSON NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'auto',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'usd',
    `theme` VARCHAR(191) NOT NULL DEFAULT 'light',
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT 'sky',
    `compactMode` BOOLEAN NOT NULL DEFAULT false,
    `showAnimations` BOOLEAN NOT NULL DEFAULT true,
    `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    `campaignAlerts` BOOLEAN NOT NULL DEFAULT true,
    `weeklyReports` BOOLEAN NOT NULL DEFAULT false,
    `budgetAlerts` BOOLEAN NOT NULL DEFAULT true,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    INDEX `Account_userId_idx`(`userId`),
    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdAccount_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_token_key`(`token`),
    UNIQUE INDEX `PasswordResetToken_email_token_key`(`email`, `token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userEmail` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_userId_idx`(`userId`),
    INDEX `ActivityLog_createdAt_idx`(`createdAt`),
    INDEX `ActivityLog_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExportConfig` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `spreadsheetUrl` TEXT NOT NULL,
    `spreadsheetId` VARCHAR(191) NOT NULL,
    `spreadsheetName` VARCHAR(191) NULL,
    `sheetName` VARCHAR(191) NOT NULL,
    `dataType` VARCHAR(191) NOT NULL,
    `accountIds` TEXT NULL,
    `columnMapping` TEXT NOT NULL,
    `autoExportEnabled` BOOLEAN NOT NULL DEFAULT false,
    `exportFrequency` VARCHAR(191) NULL,
    `exportHour` INTEGER NULL,
    `exportInterval` INTEGER NULL,
    `appendMode` BOOLEAN NOT NULL DEFAULT true,
    `includeDate` BOOLEAN NOT NULL DEFAULT true,
    `adAccountTimezone` VARCHAR(191) NULL,
    `useAdAccountTimezone` BOOLEAN NOT NULL DEFAULT false,
    `exportMinute` INTEGER NULL DEFAULT 0,
    `lastExportAt` DATETIME(3) NULL,
    `lastExportStatus` VARCHAR(191) NULL,
    `lastExportError` TEXT NULL,
    `lastExportRows` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExportConfig_userId_idx`(`userId`),
    INDEX `ExportConfig_autoExportEnabled_idx`(`autoExportEnabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SyncData` (
    `id` VARCHAR(191) NOT NULL,
    `team` VARCHAR(191) NOT NULL,
    `b` VARCHAR(191) NULL,
    `adser` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `message` INTEGER NOT NULL DEFAULT 0,
    `messageMeta` INTEGER NOT NULL DEFAULT 0,
    `lostMessages` INTEGER NOT NULL DEFAULT 0,
    `netMessages` INTEGER NOT NULL DEFAULT 0,
    `planSpend` DOUBLE NOT NULL DEFAULT 0,
    `spend` DOUBLE NOT NULL DEFAULT 0,
    `planMessage` INTEGER NOT NULL DEFAULT 0,
    `l` INTEGER NOT NULL DEFAULT 0,
    `deposit` DOUBLE NOT NULL DEFAULT 0,
    `n` INTEGER NOT NULL DEFAULT 0,
    `turnoverAdser` DOUBLE NOT NULL DEFAULT 0,
    `p` DOUBLE NOT NULL DEFAULT 0,
    `turnover` DOUBLE NOT NULL DEFAULT 0,
    `cover` DOUBLE NOT NULL DEFAULT 0,
    `pageBlocks7days` INTEGER NOT NULL DEFAULT 0,
    `pageBlocks30days` INTEGER NOT NULL DEFAULT 0,
    `silent` INTEGER NOT NULL DEFAULT 0,
    `duplicate` INTEGER NOT NULL DEFAULT 0,
    `hasUser` INTEGER NOT NULL DEFAULT 0,
    `spam` INTEGER NOT NULL DEFAULT 0,
    `blocked` INTEGER NOT NULL DEFAULT 0,
    `under18` INTEGER NOT NULL DEFAULT 0,
    `over50` INTEGER NOT NULL DEFAULT 0,
    `foreign` INTEGER NOT NULL DEFAULT 0,
    `sheetName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SyncData_team_idx`(`team`),
    INDEX `SyncData_adser_idx`(`adser`),
    INDEX `SyncData_date_idx`(`date`),
    INDEX `SyncData_sheetName_idx`(`sheetName`),
    UNIQUE INDEX `SyncData_team_adser_date_sheetName_key`(`team`, `adser`, `date`, `sheetName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExchangeRate` (
    `id` VARCHAR(191) NOT NULL,
    `rate` DOUBLE NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExchangeRate_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DashboardGoal` (
    `id` VARCHAR(191) NOT NULL,
    `tabId` INTEGER NOT NULL,
    `cover` DOUBLE NOT NULL DEFAULT 0,
    `cpm` DOUBLE NOT NULL DEFAULT 0,
    `deposit` DOUBLE NOT NULL DEFAULT 0,
    `loss` DOUBLE NOT NULL DEFAULT 0,
    `repeat` DOUBLE NOT NULL DEFAULT 0,
    `child` DOUBLE NOT NULL DEFAULT 0,
    `costPerDeposit` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `DashboardGoal_tabId_key`(`tabId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdAccount` ADD CONSTRAINT `AdAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
