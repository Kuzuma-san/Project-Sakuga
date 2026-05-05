//type: importing these ONLY for type checking, not for runtime. 
// Use it ONLY for type checking and Remove it completely in compiled JS
import type {
    AppMode, LibraryStatus, TitleType,
    TitleSources, UserRole, SubscriptionTier,
    FriendshipStatus, NotificationType, 
    // AiJobStatus
} from './enums';
// ─────────────────────────────────────────────────────────────────────────────
// BASE ENTITY — every database record has these fields
// Dates are serialised as ISO 8601 strings in API responses
// (Date objects cannot cross the JSON boundary)
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseEntity {
    id:         string; // UUID — see Step 4 for why UUID over auto-increment
    createdAt:  string; //// ISO 8601 — "2024-01-15T10:30:00.000Z"
    updatedAt:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────────────────────
export interface User extends BaseEntity {
    email:                  string,
    username:               string,
    displayName:            string | null,
    avatarUrl:              string | null,
    bio:                    string | null,
    preferredMode:          AppMode,
    role:                   UserRole,
    subscription:           SubscriptionTier,
    hasCompletedOnboarding: boolean,
    isEmailVerified:        boolean,
    // password is NEVER included in API responses — omitted at serialisation
}

// Public view of a user — safe to show to other users
export interface PublicUser {
    id:             string,
    username:       string,
    displayName:    string | null,
    avatarUrl:      string | null,
    bio:            string | null,
    // No email, no role, no subscription details
}

// ─────────────────────────────────────────────────────────────────────────────
// TITLE
// A Title is any anime, manga, manhwa, manhua, movie, OVA, etc.
// Data comes from Jikan API (anime/manga) or AniList API (manhwa/manhua).
// ─────────────────────────────────────────────────────────────────────────────

export interface Title extends BaseEntity {
    externalId:     string,         //"jikan:40748" or "anilist:101517"
    source:         TitleSources,
    type:           TitleType,
    titleEn:        string | null,
    titleJa:        string | null,
    titleRomaji:    string | null,
    synopsis:       string | null,
    coverImageUrl:  string | null,
    bannerImageUrl: string | null,
    totalChapters:  number | null,  // null if ongoing or unknown
    totalEpisodes:  number | null,
    totalVolumes:   number | null,
    status:         string,         // "airing" | "finished" | "not_yet_aired"
    score:          number | null,  // Community average score (0-10)
    popularity:     number | null,  // Rank by popularity
    year:           number | null,
    season:         string | null,  // "spring" | "summer" | "fall" | "winter"
    genre:          Genre[],
    lastSyncedAt:   string,
}

export interface Genre {
    id:     string,
    name:   string,
    slug:   string,
}

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARY ENTRY
// One row per (user, title) pair — a user can only have one entry per title.
// The @@unique([userId, titleId]) constraint in Prisma enforces this.
// ─────────────────────────────────────────────────────────────────────────────

export interface LibraryEntry extends BaseEntity {
    userId:         string,
    titleId:        string,
    status:         LibraryStatus,
    currentChapter: number,             // 0 = not started
    currentEpisode: number,
    currentVolume:  number,
    rating:         number | null,      // 1-10 score, null if unrated
    notes:          string | null,      // Private journal-style notes
    startDate:      string | null,
    finshDate:      string | null,
    isFavourite:    boolean,
    title:          Title,              // Included in responses via Prisma include
}

export interface FavouriteCharacter extends BaseEntity {//fav char for a particular title
    libraryEntryId: string,
    characterName:  string,
    characterImage: string | null,
    notes:          string | null,
}

// ─────────────────────────────────────────────────────────────────────────────
// FRIENDSHIP
// Single-row bidirectional pattern:
// One row represents the friendship between two users.
// The requester is always the user with the smaller ID (enforced by CHECK constrain
// to prevent two rows for the same friendship.
// Query: WHERE (requesterId = :me OR addresseeId = :me) AND status = 'accepted'
// ─────────────────────────────────────────────────────────────────────────────

export interface Friendship extends BaseEntity {
    requesterId:    string,
    addresseeId:    string,
    status:         FriendshipStatus,
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMENT — with nested replies via closure table pattern
// ─────────────────────────────────────────────────────────────────────────────

export interface Comment extends BaseEntity {
    userId:         string,
    titleId:        string,
    parentId:       string | null,          // null = top-level comment
    body:           string,
    isDeleted:      boolean,                // Soft delete — content replaced with "[removed]
    author:         PublicUser,
    reactionCounts: Record<string, number>, // { '❤': 12, ' ': 3 }
    replies:        Comment[],              // Populated when fetching thread
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY FEED
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityFeed extends BaseEntity{
    userId:     string,
    actorId:    string,
    type:       string,                       // 'library_add' | 'library_complete' | 'review_post
    titleId:    string | null,
    metadata:   Record<string, unknown>,  // Flexible JSON payload
    actor:      PublicUser,
    title:      Title,
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface Notification extends BaseEntity {
    userId:     string,
    type:       NotificationType,
    title:      string,
    body:       string,
    isRead:     boolean,
    linkUrl:    string | null,
    metadata:   Record<string, unknown>,
}

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH TOKEN (backend only — not sent to frontend)
// Listed here for completeness of the data model
// ─────────────────────────────────────────────────────────────────────────────

export interface RefreshTokenMeta {
    id:         string,
    userId:     string,
    familyId:   string,   // Rotation family — see Phase 2 for theft detection
    expiresAt:  string,
    revokedAt:  string | null,
}