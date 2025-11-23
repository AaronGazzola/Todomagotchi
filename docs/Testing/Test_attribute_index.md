# Test Attribute Index

**MyMovieTonight.com - Complete Test ID Reference**

All test IDs are defined in `src/test.types.ts` and applied throughout the application.

---

## Header & Navigation

### Header Component
- `header-container` - Main header wrapper
- `header-logo` - Logo/brand link
- `header-search-btn` - Search button
- `header-quiz-link` - Quiz navigation link
- `header-watchlist-link` - Watchlist navigation link
- `header-signin-btn` - Sign in button
- `header-user-menu-btn` - User menu toggle button

### User Menu Component
- `user-menu-dropdown` - User menu dropdown container
- `user-menu-user-name` - User display name
- `user-menu-user-email` - User email address
- `user-menu-signout-btn` - Sign out button

---

## Authentication

### Auth Form Component
- `auth-form-modal` - Auth modal container
- `auth-form-close-btn` - Close button
- `auth-form-mode-toggle-btn` - Toggle sign in/sign up
- `auth-form-heading` - Form heading
- `auth-form-firstname-input` - First name input (signup only)
- `auth-form-email-input` - Email input
- `auth-form-password-input` - Password input
- `auth-form-submit-btn` - Submit button
- `auth-form-error-message` - Error message display
- `auth-form-mode-toggle-link` - Mode toggle link (bottom)

---

## Home Page

### Page Sections
- `home-hero-section` - Hero section container
- `home-hero-heading` - Main heading
- `home-hero-description` - Description text
- `home-quiz-status` - Quiz completion status
- `home-dna-section` - DNA result section
- `home-mood-section` - Mood selection section
- `home-tonight-picks-section` - Tonight's picks section
- `home-loading-state` - Page loading state

---

## Mood Selection

### Mood Selection Component
- `mood-selection-container` - Main container
- `mood-selection-heading` - Section heading
- `mood-selection-clear-btn` - Clear selection button
- **Dynamic Mood Buttons:**
  - `mood-btn-espionage` - International Espionage
  - `mood-btn-surreal` - Stoned & Surreal
  - `mood-btn-heartbreak` - Heartbreak & Healing
  - `mood-btn-cosmic` - Cosmic Adventure
  - `mood-btn-dark` - Dark & Twisted
  - `mood-btn-musical` - Musical Escape
  - `mood-btn-feelgood` - Feel-Good Fun
  - `mood-btn-action` - High-Octane Action

---

## Tonight's Picks Grid

### Tonight Picks Component
- `tonight-picks-container` - Main container
- `tonight-picks-heading` - Section heading
- `tonight-picks-count` - Movie count display
- `tonight-picks-refresh-btn` - Refresh picks button
- `tonight-picks-full-refresh-btn` - Full refresh button
- `tonight-picks-grid` - Movie grid container
- `tonight-picks-error` - Error message
- `tonight-picks-error-retry-btn` - Retry button
- `tonight-picks-empty-state` - Empty state message
- `tonight-picks-loading-skeleton` - Loading skeleton

---

## Movie Components

### Movie Card Component
- `movie-card-{movieId}` - Card container (dynamic)
- `movie-card-poster` - Poster image
- `movie-card-title` - Movie title
- `movie-card-year` - Release year
- `movie-card-rating` - Rating display
- `movie-card-runtime` - Runtime display
- `movie-card-match-percentage` - Match percentage badge
- `movie-card-genres` - Genres container
- `movie-card-overview` - Overview text
- `movie-card-streaming-providers` - Streaming providers
- `movie-card-in-theatres-badge` - In theatres indicator
- `movie-card-watchlist-btn` - Add to watchlist button
- `movie-card-saw-this-btn` - Mark as seen button
- `movie-card-rate-btn` - Rate button
- `movie-card-rating-dropdown` - Rating selector
- `movie-card-rate-submit-btn` - Submit rating
- `movie-card-rate-cancel-btn` - Cancel rating

### Movie Detail Modal Component
- `movie-detail-modal` - Modal container
- `movie-detail-close-btn` - Close button
- `movie-detail-poster` - Poster image
- `movie-detail-title` - Movie title
- `movie-detail-year` - Release year
- `movie-detail-rating` - Rating display
- `movie-detail-runtime` - Runtime display
- `movie-detail-genres` - Genres list
- `movie-detail-director` - Director info
- `movie-detail-cast` - Cast list
- `movie-detail-overview` - Overview text
- `movie-detail-streaming-heading` - Streaming section heading
- `movie-detail-streaming-providers` - Streaming providers list
- `movie-detail-in-theatres` - In theatres section
- `movie-detail-trailer-link` - Watch trailer link
- `movie-detail-tmdb-link` - TMDB link

---

## Search Modal

### Search Modal Component
- `search-modal` - Modal container
- `search-modal-close-btn` - Close button
- `search-modal-heading` - Modal heading
- `search-modal-input` - Search input field
- `search-modal-loading` - Loading indicator
- `search-modal-tips-section` - Tips section
- `search-modal-tip-btn-{index}` - Tip button (dynamic)
- `search-modal-error` - Error message
- `search-modal-error-retry-btn` - Retry button
- `search-modal-no-results` - No results message
- `search-modal-results-heading` - Results heading
- `search-modal-results-count` - Results count
- `search-modal-results-grid` - Results grid
- `search-modal-refresh-btn` - Refresh results button
- `search-modal-load-more-btn` - Load more button
- `search-modal-empty-state` - Empty state

---

## Quiz Page

### Main Quiz Interface
- `quiz-page-container` - Page container
- `quiz-page-auth-warning` - Authentication warning
- `quiz-page-progress-bar` - Progress bar
- `quiz-page-progress-text` - Progress percentage
- `quiz-page-question-counter` - Question counter
- `quiz-page-question-heading` - Question text
- `quiz-page-optional-indicator` - Optional question indicator
- `quiz-page-question-container` - Question input container
- `quiz-page-error-message` - Error message
- `quiz-page-previous-btn` - Previous button
- `quiz-page-next-btn` - Next button

### Quiz Question Options (Dynamic)
- `quiz-page-radio-{questionId}-{optionId}` - Radio option
- `quiz-page-checkbox-{questionId}-{optionId}` - Checkbox option
- `quiz-page-ranking-{questionId}-{itemId}` - Ranking item

### Calibration Module - People
- `calibration-people-container` - Container
- `calibration-people-heading` - Section heading
- `calibration-people-description` - Description text
- `calibration-people-search-input` - Search input
- `calibration-people-selected-counter` - Selection counter
- `calibration-people-loading` - Loading state
- `calibration-people-error` - Error message
- `calibration-people-results-container` - Results container
- `calibration-people-person-{personId}` - Person card (dynamic)
- `calibration-people-person-image` - Person image
- `calibration-people-person-name` - Person name
- `calibration-people-person-role` - Person role
- `calibration-people-person-toggle` - Selection toggle
- `calibration-people-show-more-btn` - Show more button
- `calibration-people-back-btn` - Back to questions
- `calibration-people-next-btn` - Next to movies

### Calibration Module - Movies
- `calibration-movies-container` - Container
- `calibration-movies-heading` - Section heading
- `calibration-movies-description` - Description text
- `calibration-movies-search-input` - Search input
- `calibration-movies-rated-counter` - Rating counter
- `calibration-movies-loading` - Loading state
- `calibration-movies-error` - Error message
- `calibration-movies-grid` - Movies grid
- `calibration-movies-movie-{movieId}` - Movie card (dynamic)
- `calibration-movies-movie-poster` - Movie poster
- `calibration-movies-movie-title` - Movie title
- `calibration-movies-like-btn-{movieId}` - Like button (dynamic)
- `calibration-movies-dislike-btn-{movieId}` - Dislike button (dynamic)
- `calibration-movies-not-seen-btn-{movieId}` - Not seen button (dynamic)
- `calibration-movies-back-btn` - Back to people
- `calibration-movies-refresh-btn` - Refresh titles
- `calibration-movies-finish-btn` - Finish quiz
- `calibration-movies-finish-loading` - Finish loading state

### Quiz Complete Screen
- `quiz-complete-container` - Container
- `quiz-complete-success-icon` - Success icon
- `quiz-complete-heading` - Heading
- `quiz-complete-dna-result` - DNA result box
- `quiz-complete-dna-archetype` - Archetype name
- `quiz-complete-dna-description` - Description
- `quiz-complete-dna-traits` - Traits section
- `quiz-complete-finetune-btn` - Fine-tune preferences
- `quiz-complete-skip-btn` - Skip to recommendations
- `quiz-complete-retake-btn` - Retake quiz

---

## Cinematic DNA

### DNA Component
- `dna-container` - Main container
- `dna-icon-container` - Icon container
- `dna-heading` - Section heading
- `dna-archetype-name` - Archetype name
- `dna-description` - Description text
- `dna-traits-section` - Traits section
- `dna-trait-badge-{traitId}` - Trait badge (dynamic)
- `dna-explorer-badge` - Explorer badge
- `dna-footer-text` - Footer text

---

## Watchlist Page

### Watchlist Component
- `watchlist-page-container` - Page container
- `watchlist-page-header` - Header section
- `watchlist-page-title` - Page title
- `watchlist-page-count` - Movie count
- `watchlist-page-refresh-btn` - Refresh button
- `watchlist-page-error` - Error message
- `watchlist-page-error-retry-link` - Retry link
- `watchlist-page-loading` - Loading state
- `watchlist-page-empty-state` - Empty state container
- `watchlist-page-empty-icon` - Empty state icon
- `watchlist-page-empty-heading` - Empty state heading
- `watchlist-page-empty-description` - Empty state description
- `watchlist-page-discover-btn` - Discover movies button
- `watchlist-page-grid` - Movie grid

---

## CTA Components

### Quiz CTA Component
- `cta-quiz-btn-discover` - Discover Your DNA button
- `cta-quiz-btn-retake` - Retake Quiz button

---

## Global State Indicators

### Common States
- `loading-spinner` - Generic loading spinner
- `error-message` - Generic error message
- `success-message` - Generic success message
- `empty-state` - Generic empty state

---

## Helper Functions Reference

Use these functions from `src/test.types.ts` to generate dynamic test IDs:

```typescript
import { createTestId } from '@/test.types';

// Movie Cards
createTestId.movieCard(movieId) // "movie-card-{movieId}"

// Mood Buttons
createTestId.moodBtn(moodId) // "mood-btn-{moodId}"

// Quiz Options
createTestId.quizRadio(questionId, optionId) // "quiz-page-radio-{questionId}-{optionId}"
createTestId.quizCheckbox(questionId, optionId) // "quiz-page-checkbox-{questionId}-{optionId}"
createTestId.quizRanking(questionId, itemId) // "quiz-page-ranking-{questionId}-{itemId}"

// Calibration
createTestId.calibrationPerson(personId) // "calibration-people-person-{personId}"
createTestId.calibrationMovie(movieId) // "calibration-movies-movie-{movieId}"
createTestId.calibrationLikeBtn(movieId) // "calibration-movies-like-btn-{movieId}"
createTestId.calibrationDislikeBtn(movieId) // "calibration-movies-dislike-btn-{movieId}"
createTestId.calibrationNotSeenBtn(movieId) // "calibration-movies-not-seen-btn-{movieId}"

// DNA Traits
createTestId.dnaTrait(traitId) // "dna-trait-badge-{traitId}"

// Search Tips
createTestId.searchTipBtn(index) // "search-modal-tip-btn-{index}"

// Streaming & Genres
createTestId.streamingProvider(providerId) // "streaming-provider-{providerId}"
createTestId.genreBadge(genreId) // "genre-badge-{genreId}"
createTestId.castMember(personId) // "cast-member-{personId}"
```

---

## Testing Usage Examples

### Playwright Example
```typescript
// Click search button
await page.click('[data-testid="header-search-btn"]');

// Fill search input
await page.fill('[data-testid="search-modal-input"]', 'action movies');

// Click movie card
await page.click('[data-testid="movie-card-12345"]');

// Submit auth form
await page.fill('[data-testid="auth-form-email-input"]', 'test@example.com');
await page.fill('[data-testid="auth-form-password-input"]', 'password123');
await page.click('[data-testid="auth-form-submit-btn"]');
```

### Testing Library Example
```typescript
import { screen } from '@testing-library/react';

// Find elements
const searchBtn = screen.getByTestId('header-search-btn');
const emailInput = screen.getByTestId('auth-form-email-input');
const submitBtn = screen.getByTestId('auth-form-submit-btn');

// Interact
fireEvent.click(searchBtn);
fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
fireEvent.click(submitBtn);
```

### Cypress Example
```typescript
// Navigate and interact
cy.get('[data-testid="header-quiz-link"]').click();
cy.get('[data-testid="quiz-page-radio-q1-option1"]').click();
cy.get('[data-testid="quiz-page-next-btn"]').click();
```

---

## Coverage Statistics

- **Total Test IDs:** 170+
- **Components Covered:** 13
- **Pages Covered:** 3
- **Dynamic IDs:** 15+ types
- **State Indicators:** 4 global states

---

## Maintenance Notes

1. **Adding New Test IDs:**
   - Add new enum values to `src/test.types.ts`
   - Apply to components using `data-testid={TestId.YOUR_NEW_ID}`
   - Update this index with the new ID

2. **Dynamic IDs:**
   - Use `createTestId` helper functions for consistency
   - Always include the entity ID in dynamic test IDs

3. **Best Practices:**
   - Keep test IDs descriptive and hierarchical
   - Use kebab-case for all test ID values
   - Group related test IDs by component/feature
   - Update this index when adding new components

---

**Last Updated:** 2025-11-23
**Version:** 1.0.0
