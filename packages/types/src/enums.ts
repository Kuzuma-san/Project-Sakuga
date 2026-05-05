// ─────────────────────────────────────────────────────────────────────────────
// All application-wide enums.
// String values are used so that database records, API responses, and logs
// are human-readable without needing to look up numeric mappings.
// ─────────────────────────────────────────────────────────────────────────────

export enum AppMode {
    ANIME = 'anime',
    MANGA = 'manga',
}

// Library entry statuses differ slightly in display text between modes
// (READING = "Watching" in anime mode, "Reading" in manga mode)
// but the underlying status values are identical — mode-specific labels
// are handled in the frontend display layer, not in the database.

export enum LibraryStatus {
    READING         = 'reading',
    COMPLETED       = 'completed',
    ON_HOLD         = 'on_hold',
    DROPPED         = 'dropped',
    PLAN_TO_READ    = 'plan_to_read',
    SEED            = 'seed',  // Added during onboarding — not a real "read"
}

export enum TitleType {
    ANIME   = 'anime',
    MANGA   = 'manga',
    MANHWA  = 'manhwa',
    MANHUA  = 'manhua',
    NOVEL   = 'novel',  // Light novels tracked as manga-mode content
    OVA     = 'ova',
    SPECIAL = 'special',
}

export enum TitleSources {
    JIKAN   = 'jikan',  // MyAnimeList via Jikan API
    ANILIST = 'anilist',// AniList API (manhwa/manhua)
    MANUAL  = 'manual', // User-submitted titles not in either API
}

export enum UserRole {
    USER  = 'user',
    ADMIN = 'admin',
}

export enum SubscriptionTier {
    FREE = 'free',
    PRO  = 'pro',
}

export enum FriendshipStatus {
    PENDING  = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
    BLOCKED  = 'blocked',
}

export enum NotificationType {
    FRIEND_REQUEST  = 'friend_request',
    FRIEND_ACCEPTED = 'friend_accepted',
    COMMENT_REPLY   = 'comment_reply',
    TITLE_UPDATE    = 'title_update',
    SYSTEM          = 'system',
}

export enum AiJobStatus {
    PENDING     = 'pending',
    PROCESSING  = 'processing',
    COMPLETED   = 'completed',
    FAILED      = 'failed',
}

export enum KafkaTopic {
    LIBRARY_ENTRY_CREATED       = 'library.entry.created',
    LIBRARY_ENTRY_UPDATED       = 'library.entry.updated',
    USER_ONBOARDING_COMPLETED   = 'user.onboarding.completed',
    TITLE_SYNC_REQUESTED        = 'title.sync.requested',
    USER_ACTIVITY_CREATED       = 'user.activity.created',
    AI_SUMMARY_REQUESTED        = 'ai.summary.requested',
}