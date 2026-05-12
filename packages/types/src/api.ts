import type { AppMode, LibraryStatus, TitleType } from './enums';
import type { ActivityEntry, Comment, Notification, Title, User } from './entities';

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// We use cursor-based pagination throughout.
// Why cursor over offset: see interview question below.
// ─────────────────────────────────────────────────────────────────────────────

export interface CursorPaginationQuery{
    cursor?:    string;    // The last seen ID — return results AFTER this
    limit?:     number;    // Default 20, max 100
}

export interface PaginatedResponse<T> {
    data:       T[];
    nextCursor: string | null;  // null = no more pages
    hasMore:    boolean;
    total?:     number;         // Included only when cheap to compute
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterDto {
    email:          string;
    username:       string;
    password:       string;
    displayName?:   string;
}

export interface LoginDto {
    email:      string;
    password:   string;
}

export interface AuthResponse {
    accessToken:    string;
    user:           User;
    // refreshToken is in httpOnly cookie — NOT in this response body
}

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────────────────────

export interface CompleteOnboardingDto {
    mode:       AppMode;
    genres:     string[];   // 3-5 genre slugs
    seedTitles: string[];   // 3-5 title IDs for cold-start seeding
}

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARY
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateLibraryEntryDto {
    titleId:    string;
    status:     LibraryStatus;
}

export interface UpdateLibraryEntryDto {
    status?:            LibraryStatus;
    currentChapter?:    number;
    currentEpisode?:    number;
    currentVolume?:     number;
    rating?:            number;     // 1-10, or null to remove
    notes?:             string;
    startDate?:         string;     // ISO 8601
    finishDate?:        string;
    isfavourite?:       boolean;
}

export interface AddFavouriteCharacterDto {
    libraryEntryId:     string;
    characterName:      string;
    characterImage?:    string;
    notes?:             string; 
}

export interface ListLibraryQuery extends CursorPaginationQuery {
    status?:    LibraryStatus;
    type?:      TitleType;
    userId?:    string;         // If not provided, returns current user's library
}

// ─────────────────────────────────────────────────────────────────────────────
// TITLE SEARCH
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchTitleQuery {
    q:          string;     // Search Query
    type?:      TitleType;  // Filter to anime only, manga only, etc.
    genres?:    string[];   // Filter by genre slugs
    year?:      number;
    status?:    string;     // "airing" | "finished"
    cursor?:    string;
    limit?:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL
// ─────────────────────────────────────────────────────────────────────────────

export interface sendFriendRequestDto {
    addresseeId: string;   
}

export interface RespondFriendRequestDto {
    friendshipId:   string;
    action:         'accept' | 'decline';
}

export interface CreateCommentDto {
    titleId:    string;
    body:       string;
    parentId?:  string;     // For replies
}

export interface AddReactionDto {
    commentId:  string;
    emoji:      string;     // e.g. '❤' — validated against allowed set server-side
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

export interface AiSummaryRequest {
    titleId: string;
}

export interface AiSummaryResponse {
    titleId:        string;
    summary:        string;
    generatedAt:    string;
    cached:         boolean;
}

export interface RecommendationItem {
    title:  Title;
    score:  number;     // 0-1 confidence score
    reason: string;     // Human-readable explanation
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET EVENTS
// Every WebSocket event sent or received is typed here.
// The client and server both import these — no silent mismatches.
// ─────────────────────────────────────────────────────────────────────────────

export interface WsActivityEvent {
    type:   'activity';
    payload: ActivityEntry;
}

export interface WsCommentEvent {
    type:   'new_comment';
    titleId: string;
    comment: Comment;
}

export interface WsPresenceEvent {
    type:   'presence';
    userId: string;
    online: boolean;
}

export interface WsNotificationEvent {
    type:           'notification';
    notification:   Notification;
}

export type WsServerToClientEvent = 
    | WsActivityEvent
    | WsCommentEvent
    | WsPresenceEvent
    | WsNotificationEvent;

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS (Pro tier)
// ─────────────────────────────────────────────────────────────────────────────

export interface UserStats {
    totalTitles:        number;
    completedTitles:    number;
    totalChapters:      number;
    totalEpisodes:      number;
    averageRating:      number;
    genreBreakdown:     Array<{genre: string, count: number, percentage: number}>;
    statusBreakdown:    Array<{status: LibraryStatus, count: number}>;
    readingStreak:      number;      // consecutive days with activity
    activityHeatmap:    Array<{date: string, count: number}>;  //last 365 days
}
