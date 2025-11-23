# MyMovieTonight.com - E2E Test Suite

This document describes the complete end-to-end test suite for MyMovieTonight.com, covering authentication, Cinematic DNA quiz, personalized recommendations, search, user collections, and movie details.

## Test Philosophy

Tests focus on **user-facing features and functionality**, not infrastructure. Email verification and Supabase internals are tested manually. All tests use pre-verified users created via Supabase Admin API (see [Supawright.md](./Supawright.md)).

## Test Index

### Authentication Tests (9 tests)
1. [New user signup with valid credentials](#1-new-user-signup-with-valid-credentials) - `npm run test:e2e:auth`
2. [New user signup creates profile](#2-new-user-signup-creates-profile) - `npm run test:e2e:auth`
3. [Duplicate email signup attempt shows error](#3-duplicate-email-signup-attempt-shows-error) - `npm run test:e2e:auth`
4. [User login with valid credentials](#4-user-login-with-valid-credentials) - `npm run test:e2e:auth`
5. [User login with invalid credentials shows error](#5-user-login-with-invalid-credentials-shows-error) - `npm run test:e2e:auth`
6. [User logout clears session](#6-user-logout-clears-session) - `npm run test:e2e:auth`
7. [Session persists across page refresh](#7-session-persists-across-page-refresh) - `npm run test:e2e:auth`
8. [Profile data loads after login](#8-profile-data-loads-after-login) - `npm run test:e2e:auth`
9. [Anonymous user can browse without auth](#9-anonymous-user-can-browse-without-auth) - `npm run test:e2e:auth`

### Cinematic DNA Quiz Tests (12 tests)
10. [New user prompted to take quiz](#10-new-user-prompted-to-take-quiz) - `npm run test:e2e:quiz`
11. [Complete quiz with all required questions](#11-complete-quiz-with-all-required-questions) - `npm run test:e2e:quiz`
12. [Skip optional ranking question (Q3)](#12-skip-optional-ranking-question-q3) - `npm run test:e2e:quiz`
13. [Navigate back and forward through questions](#13-navigate-back-and-forward-through-questions) - `npm run test:e2e:quiz`
14. [Calibration: Select actors and directors (0-8)](#14-calibration-select-actors-and-directors-0-8) - `npm run test:e2e:quiz`
15. [Calibration: Search for actors/directors](#15-calibration-search-for-actorsdirectors) - `npm run test:e2e:quiz`
16. [Calibration: Rate movies (like/dislike/not seen)](#16-calibration-rate-movies-likedislikenot-seen) - `npm run test:e2e:quiz`
17. [Calibration: Search for movies](#17-calibration-search-for-movies) - `npm run test:e2e:quiz`
18. [Skip calibration entirely](#18-skip-calibration-entirely) - `npm run test:e2e:quiz`
19. [DNA calculation for all 6 archetypes](#19-dna-calculation-for-all-6-archetypes) - `npm run test:e2e:quiz`
20. [Explorer flag determined by Q6 response](#20-explorer-flag-determined-by-q6-response) - `npm run test:e2e:quiz`
21. [Retake quiz clears previous data](#21-retake-quiz-clears-previous-data) - `npm run test:e2e:quiz`

### Recommendation Engine Tests (10 tests)
22. [Initial recommendations with completed quiz](#22-initial-recommendations-with-completed-quiz) - `npm run test:e2e:recommendations`
23. [Initial recommendations without quiz (fallback)](#23-initial-recommendations-without-quiz-fallback) - `npm run test:e2e:recommendations`
24. [Recommendations batch generates ~100 movies](#24-recommendations-batch-generates-100-movies) - `npm run test:e2e:recommendations`
25. [Display 10 movies at a time](#25-display-10-movies-at-a-time) - `npm run test:e2e:recommendations`
26. [Partial refresh shows new 10 from batch](#26-partial-refresh-shows-new-10-from-batch) - `npm run test:e2e:recommendations`
27. [Full refresh generates new batch](#27-full-refresh-generates-new-batch) - `npm run test:e2e:recommendations`
28. [Mood button filtering](#28-mood-button-filtering) - `npm run test:e2e:recommendations`
29. [Personalization based on DNA and calibration](#29-personalization-based-on-dna-and-calibration) - `npm run test:e2e:recommendations`
30. [Edge function failure fallback to TMDB trending](#30-edge-function-failure-fallback-to-tmdb-trending) - `npm run test:e2e:recommendations`
31. [Anonymous user recommendations use device_id](#31-anonymous-user-recommendations-use-device_id) - `npm run test:e2e:recommendations`

### Search & Discovery Tests (8 tests)
32. [Natural language search with valid query](#32-natural-language-search-with-valid-query) - `npm run test:e2e:search`
33. [Search debounce behavior (800ms)](#33-search-debounce-behavior-800ms) - `npm run test:e2e:search`
34. [Search with <2 characters does not trigger](#34-search-with-2-characters-does-not-trigger) - `npm run test:e2e:search`
35. [Search returns relevant results](#35-search-returns-relevant-results) - `npm run test:e2e:search`
36. [Load more results appends without duplicates](#36-load-more-results-appends-without-duplicates) - `npm run test:e2e:search`
37. [Refresh results re-queries with same search](#37-refresh-results-re-queries-with-same-search) - `npm run test:e2e:search`
38. [Search error handling and retry](#38-search-error-handling-and-retry) - `npm run test:e2e:search`
39. [Empty search results display empty state](#39-empty-search-results-display-empty-state) - `npm run test:e2e:search`

### User Collections Tests (11 tests)
40. [Add movie to watchlist](#40-add-movie-to-watchlist) - `npm run test:e2e:collections`
41. [Remove movie from watchlist](#41-remove-movie-from-watchlist) - `npm run test:e2e:collections`
42. [Mark movie as seen](#42-mark-movie-as-seen) - `npm run test:e2e:collections`
43. [Unmark movie as seen](#43-unmark-movie-as-seen) - `npm run test:e2e:collections`
44. [Rate movie with 1-10 stars](#44-rate-movie-with-1-10-stars) - `npm run test:e2e:collections`
45. [Change movie rating](#45-change-movie-rating) - `npm run test:e2e:collections`
46. [Remove movie rating](#46-remove-movie-rating) - `npm run test:e2e:collections`
47. [Watchlist page displays all saved movies](#47-watchlist-page-displays-all-saved-movies) - `npm run test:e2e:collections`
48. [Empty watchlist shows empty state](#48-empty-watchlist-shows-empty-state) - `npm run test:e2e:collections`
49. [Anonymous user interactions use device_id](#49-anonymous-user-interactions-use-device_id) - `npm run test:e2e:collections`
50. [Multiple interaction types on same movie](#50-multiple-interaction-types-on-same-movie) - `npm run test:e2e:collections`

### Movie Details Tests (8 tests)
51. [Open movie detail modal from grid](#51-open-movie-detail-modal-from-grid) - `npm run test:e2e:movies`
52. [Display all movie information fields](#52-display-all-movie-information-fields) - `npm run test:e2e:movies`
53. [Display cast and director](#53-display-cast-and-director) - `npm run test:e2e:movies`
54. [Display streaming availability](#54-display-streaming-availability) - `npm run test:e2e:movies`
55. [Display match percentage and recommendation reason](#55-display-match-percentage-and-recommendation-reason) - `npm run test:e2e:movies`
56. [Watch trailer link opens YouTube](#56-watch-trailer-link-opens-youtube) - `npm run test:e2e:movies`
57. [TMDB link opens movie page](#57-tmdb-link-opens-movie-page) - `npm run test:e2e:movies`
58. [Missing poster shows placeholder](#58-missing-poster-shows-placeholder) - `npm run test:e2e:movies`

### System Quality Tests (10 tests)
59. [Loading states display correctly across features](#59-loading-states-display-correctly-across-features) - `npm run test:e2e:system`
60. [Error states with retry functionality](#60-error-states-with-retry-functionality) - `npm run test:e2e:system`
61. [Empty states display appropriate messaging](#61-empty-states-display-appropriate-messaging) - `npm run test:e2e:system`
62. [Responsive design on mobile viewport](#62-responsive-design-on-mobile-viewport) - `npm run test:e2e:system`
63. [Responsive design on tablet viewport](#63-responsive-design-on-tablet-viewport) - `npm run test:e2e:system`
64. [Device ID persists in localStorage](#64-device-id-persists-in-localstorage) - `npm run test:e2e:system`
65. [Edge function timeout handling](#65-edge-function-timeout-handling) - `npm run test:e2e:system`
66. [TMDB API failure graceful degradation](#66-tmdb-api-failure-graceful-degradation) - `npm run test:e2e:system`
67. [Concurrent operations do not conflict](#67-concurrent-operations-do-not-conflict) - `npm run test:e2e:system`
68. [Quiz completion updates profile correctly](#68-quiz-completion-updates-profile-correctly) - `npm run test:e2e:system`

---

## Authentication Tests

### 1. New user signup with valid credentials

**Pass Conditions:**
- User can fill email and password fields via `auth-form-email-input` and `auth-form-password-input`
- Submit button `auth-form-submit-btn` is clickable
- Submission succeeds without error
- User is redirected to home page (`/`)
- `auth-form-modal` closes
- User menu button `header-user-menu-btn` is visible

**Test Data:**
- Email: `newuser-${timestamp}@test.com`
- Password: `SecurePass123!`
- First name: `Test User`

**Related Test IDs:** `auth-form-modal`, `auth-form-email-input`, `auth-form-password-input`, `auth-form-submit-btn`, `header-user-menu-btn`

---

### 2. New user signup creates profile

**Pass Conditions:**
- After successful signup, profile record exists in database
- Profile has correct `id` matching auth user
- Profile `username` matches first name provided
- Profile `dna_type` is null (quiz not completed)
- Profile `intl_openness` is null

**Test Data:**
- Email: `profile-user-${timestamp}@test.com`
- Password: `SecurePass123!`
- First name: `Profile User`

**Related Test IDs:** `auth-form-firstname-input`, `auth-form-submit-btn`

---

### 3. Duplicate email signup attempt shows error

**Pass Conditions:**
- Create user via admin API first
- Attempt signup with same email
- Error message displays via `auth-form-error-message`
- Error message contains text about email already registered
- User remains on auth form
- Submit button re-enables after error

**Test Data:**
- Email: `duplicate@test.com`
- Password: `Password123!`

**Related Test IDs:** `auth-form-error-message`, `auth-form-submit-btn`

---

### 4. User login with valid credentials

**Pass Conditions:**
- Create pre-verified user via admin API
- Navigate to auth form
- Fill email and password
- Submit login
- Redirect to home page (`/`)
- User menu button `header-user-menu-btn` visible
- User email displayed in dropdown `user-menu-user-email`

**Test Data:**
- Email: `loginuser@test.com`
- Password: `ValidPass123!`

**Related Test IDs:** `auth-form-email-input`, `auth-form-password-input`, `auth-form-submit-btn`, `header-user-menu-btn`, `user-menu-user-email`

---

### 5. User login with invalid credentials shows error

**Pass Conditions:**
- Attempt login with non-existent email or wrong password
- Error message displays via `auth-form-error-message`
- Error text indicates invalid credentials
- User remains on login form
- Can retry after error

**Test Data:**
- Email: `wrong@test.com`
- Password: `WrongPass123!`

**Related Test IDs:** `auth-form-error-message`, `auth-form-submit-btn`

---

### 6. User logout clears session

**Pass Conditions:**
- Login as authenticated user
- Click user menu button `header-user-menu-btn`
- User menu dropdown `user-menu-dropdown` appears
- Click sign out button `user-menu-signout-btn`
- Redirect to home page
- User menu button replaced with sign in button `header-signin-btn`
- Session cleared (check Supabase auth state)

**Test Data:**
- Pre-verified user via admin API

**Related Test IDs:** `header-user-menu-btn`, `user-menu-dropdown`, `user-menu-signout-btn`, `header-signin-btn`

---

### 7. Session persists across page refresh

**Pass Conditions:**
- Login as authenticated user
- Verify user menu visible
- Refresh page (hard reload)
- User remains authenticated
- User menu button still visible
- User email still displayed in dropdown

**Test Data:**
- Pre-verified user via admin API

**Related Test IDs:** `header-user-menu-btn`, `user-menu-user-email`

---

### 8. Profile data loads after login

**Pass Conditions:**
- Create user with profile via admin API
- Profile has `dna_type` = `'adrenaline_seeker'`
- Login as user
- Navigate to home page
- DNA result section `home-dna-section` is visible
- DNA archetype name `dna-archetype-name` contains "Adrenaline Seeker"

**Test Data:**
- User with completed quiz (DNA type set)

**Related Test IDs:** `home-dna-section`, `dna-archetype-name`

---

### 9. Anonymous user can browse without auth

**Pass Conditions:**
- Visit home page without authentication
- Sign in button `header-signin-btn` visible
- Can view Tonight's Picks `tonight-picks-grid`
- Can interact with mood buttons (e.g., `mood-btn-action`)
- Device ID generated and stored in localStorage
- Can add movies to watchlist (uses device_id)

**Test Data:**
- No authentication required

**Related Test IDs:** `header-signin-btn`, `tonight-picks-grid`, `mood-btn-action`

---

## Cinematic DNA Quiz Tests

### 10. New user prompted to take quiz

**Pass Conditions:**
- Create new user without quiz data
- Login and navigate to home page
- Quiz CTA button `cta-quiz-btn-discover` is visible
- Button text is "Discover Your DNA"
- Click button navigates to `/quiz`

**Test Data:**
- User without quiz completion

**Related Test IDs:** `cta-quiz-btn-discover`, `home-quiz-status`

---

### 11. Complete quiz with all required questions

**Pass Conditions:**
- Navigate to `/quiz` as authenticated user
- Progress bar `quiz-page-progress-bar` starts at 0%
- Answer Q1 (checkbox, select 2 emotions) via `quiz-page-checkbox-q1-{optionId}`
- Progress updates after each question
- Answer Q2 (radio) via `quiz-page-radio-q2-{optionId}`
- Answer Q3 (ranking, optional) - provide ranking
- Answer Q4 (checkbox, select 2 tones)
- Answer Q5 (radio, runtime)
- Answer Q6 (radio, subtitles)
- Progress reaches 100%
- Next button `quiz-page-next-btn` navigates to calibration
- All responses saved to `cinematic_dna_quiz_responses` table

**Test Data:**
- Q1: Select "thrilled" and "uplifted"
- Q2: Select "edge-of-seat"
- Q3: Rank all 4 items
- Q4: Select "dark" and "intense"
- Q5: Select "120+min"
- Q6: Select "love-subtitles"

**Related Test IDs:** `quiz-page-progress-bar`, `quiz-page-progress-text`, `quiz-page-question-counter`, `quiz-page-next-btn`, `quiz-page-checkbox-*`, `quiz-page-radio-*`, `quiz-page-ranking-*`

---

### 12. Skip optional ranking question (Q3)

**Pass Conditions:**
- Navigate to Q3 (ranking question)
- Optional indicator `quiz-page-optional-indicator` visible
- Click next without ranking
- No error displayed
- Navigate to Q4 successfully
- Q3 ranking columns null in database

**Test Data:**
- Complete all other questions, skip Q3

**Related Test IDs:** `quiz-page-optional-indicator`, `quiz-page-next-btn`

---

### 13. Navigate back and forward through questions

**Pass Conditions:**
- Complete Q1 and Q2
- Click previous button `quiz-page-previous-btn` from Q3
- Returns to Q2 with previous answer selected
- Click next to Q3
- Previous answer on Q2 still saved
- Navigate back to Q1
- First answer preserved

**Test Data:**
- Any valid answers

**Related Test IDs:** `quiz-page-previous-btn`, `quiz-page-next-btn`, `quiz-page-question-counter`

---

### 14. Calibration: Select actors and directors (0-8)

**Pass Conditions:**
- Complete core quiz questions
- Navigate to calibration people module
- Heading `calibration-people-heading` visible
- Selection counter `calibration-people-selected-counter` shows "0/8"
- Click person card toggle `calibration-people-person-toggle`
- Counter updates to "1/8"
- Select up to 8 people
- Counter shows "8/8"
- Attempting to select 9th person shows disabled state or warning
- Click next `calibration-people-next-btn` saves selections to `calibration_actors_directors` table

**Test Data:**
- Select 5 actors/directors from curated list

**Related Test IDs:** `calibration-people-container`, `calibration-people-heading`, `calibration-people-selected-counter`, `calibration-people-person-{personId}`, `calibration-people-person-toggle`, `calibration-people-next-btn`

---

### 15. Calibration: Search for actors/directors

**Pass Conditions:**
- In calibration people module
- Type in search input `calibration-people-search-input`
- Debounce 500ms before search triggers
- Search with <2 characters does not trigger API call
- Search with ≥2 characters calls TMDB
- Results appear in `calibration-people-results-container`
- Each result has image `calibration-people-person-image`, name `calibration-people-person-name`, role `calibration-people-person-role`
- Can select from search results
- Duplicate prevention (can't select same person twice)

**Test Data:**
- Search query: "Tom Hanks"

**Related Test IDs:** `calibration-people-search-input`, `calibration-people-results-container`, `calibration-people-person-{personId}`

---

### 16. Calibration: Rate movies (like/dislike/not seen)

**Pass Conditions:**
- Navigate to calibration movies module
- Heading `calibration-movies-heading` visible
- Movies grid `calibration-movies-grid` displays 12 movies
- Each movie card has poster `calibration-movies-movie-poster`, title `calibration-movies-movie-title`
- Click like button `calibration-movies-like-btn-{movieId}` - button highlights
- Click dislike button `calibration-movies-dislike-btn-{movieId}` - like unhighlights, dislike highlights
- Click not seen button `calibration-movies-not-seen-btn-{movieId}` - all buttons unhighlight
- Rated counter `calibration-movies-rated-counter` updates with each rating
- Ratings saved to `calibration_movie_ratings` table with rating value (-1, 0, 1)

**Test Data:**
- Like 3 movies, dislike 2 movies, mark 1 as not seen

**Related Test IDs:** `calibration-movies-container`, `calibration-movies-grid`, `calibration-movies-movie-{movieId}`, `calibration-movies-like-btn-{movieId}`, `calibration-movies-dislike-btn-{movieId}`, `calibration-movies-not-seen-btn-{movieId}`, `calibration-movies-rated-counter`

---

### 17. Calibration: Search for movies

**Pass Conditions:**
- In calibration movies module
- Type in search input `calibration-movies-search-input`
- Debounce 500ms before search
- Search with <2 characters does not trigger
- Search with ≥2 characters calls TMDB
- Results replace grid
- Can rate searched movies
- Duplicate prevention by title+year

**Test Data:**
- Search query: "The Matrix"

**Related Test IDs:** `calibration-movies-search-input`, `calibration-movies-grid`

---

### 18. Skip calibration entirely

**Pass Conditions:**
- Complete core quiz questions
- Navigate to calibration people
- Click "Skip to recommendations" or equivalent
- OR click back button `calibration-people-back-btn` and navigate away
- No calibration data saved
- DNA still calculated from core quiz only
- Redirected to quiz complete screen

**Test Data:**
- Core quiz answers only

**Related Test IDs:** `calibration-people-back-btn`, `quiz-complete-skip-btn`

---

### 19. DNA calculation for all 6 archetypes

**Pass Conditions:**
- For each archetype (adrenaline_seeker, heart, thinker, escapist, aesthete, shadow):
  - Create specific answer set that scores highest for that archetype
  - Complete quiz with those answers
  - DNA result `quiz-complete-dna-archetype` displays correct archetype name
  - Profile `dna_type` updated correctly
  - DNA description `quiz-complete-dna-description` matches archetype
  - DNA traits `quiz-complete-dna-traits` display appropriate badges

**Test Data:**
- 6 separate test cases, one per archetype
- Answer sets designed to maximize each archetype score

**Related Test IDs:** `quiz-complete-dna-result`, `quiz-complete-dna-archetype`, `quiz-complete-dna-description`, `quiz-complete-dna-traits`

---

### 20. Explorer flag determined by Q6 response

**Pass Conditions:**
- Complete quiz with Q6 = "love-subtitles" or "open-subtitles"
- Profile `intl_openness` = true
- DNA result shows Explorer badge `dna-explorer-badge`
- Complete quiz with Q6 = "avoid-subtitles"
- Profile `intl_openness` = false
- No Explorer badge displayed

**Test Data:**
- Two test cases: Q6 with/without subtitle preference

**Related Test IDs:** `dna-explorer-badge`, `quiz-page-radio-q6-{optionId}`

---

### 21. Retake quiz clears previous data

**Pass Conditions:**
- Complete quiz with DNA type set
- Navigate to home page
- DNA section `home-dna-section` shows previous result
- Click retake button `cta-quiz-btn-retake`
- Confirm retake (if confirmation dialog exists)
- Redirected to `/quiz`
- Previous quiz responses deleted from database
- Previous calibration data deleted
- Profile `dna_type` set to null
- Complete new quiz
- New DNA type saved
- Old data completely removed

**Test Data:**
- First quiz: DNA type "heart"
- Retake quiz: New answers leading to "adrenaline_seeker"

**Related Test IDs:** `cta-quiz-btn-retake`, `home-dna-section`, `quiz-page-container`

---

## Recommendation Engine Tests

### 22. Initial recommendations with completed quiz

**Pass Conditions:**
- Create user with completed quiz (DNA type = "heart")
- Login and navigate to home page
- Tonight's Picks section `tonight-picks-container` visible
- Loading skeleton `tonight-picks-loading-skeleton` appears briefly
- Movies grid `tonight-picks-grid` displays exactly 10 movies
- Each movie card has data matching DNA type (romantic, uplifting themes)
- Recommendations fetched from edge function `/functions/v1/recommendations`
- Request includes user_id and DNA-based mood query

**Test Data:**
- User with DNA type "heart", calibration data with romantic actors

**Related Test IDs:** `tonight-picks-container`, `tonight-picks-grid`, `tonight-picks-loading-skeleton`, `movie-card-{movieId}`

---

### 23. Initial recommendations without quiz (fallback)

**Pass Conditions:**
- Create user without quiz completion
- Login and navigate to home page
- Recommendations still load
- Fallback to TMDB trending movies
- Grid displays 10 movies
- No DNA-based personalization
- No errors displayed

**Test Data:**
- User without quiz data

**Related Test IDs:** `tonight-picks-grid`, `tonight-picks-error`

---

### 24. Recommendations batch generates ~100 movies

**Pass Conditions:**
- Intercept network request to `/functions/v1/recommendations`
- Request includes `limit: 100`
- Response contains ~100 movie IDs
- Client stores full batch
- Only 10 displayed initially
- Remaining 90 available for partial refresh

**Test Data:**
- User with completed quiz

**Related Test IDs:** `tonight-picks-grid`, Network inspection

---

### 25. Display 10 movies at a time

**Pass Conditions:**
- Load recommendations
- Count movie cards in grid `tonight-picks-grid`
- Exactly 10 movie cards visible
- Movie count display `tonight-picks-count` shows "10 picks for you"
- Each card fully rendered with poster, title, year, rating

**Test Data:**
- Any user with recommendations

**Related Test IDs:** `tonight-picks-grid`, `tonight-picks-count`, `movie-card-{movieId}`

---

### 26. Partial refresh shows new 10 from batch

**Pass Conditions:**
- Load initial 10 movies
- Record displayed movie IDs
- Click refresh button `tonight-picks-refresh-btn`
- Loading state appears briefly
- New set of 10 movies displayed
- No overlap with previous 10 (different movie IDs)
- No network request to edge function (uses cached batch)
- Can refresh multiple times until batch exhausted

**Test Data:**
- User with 100-movie batch

**Related Test IDs:** `tonight-picks-refresh-btn`, `tonight-picks-grid`, `tonight-picks-loading-skeleton`

---

### 27. Full refresh generates new batch

**Pass Conditions:**
- Load initial recommendations
- Click full refresh button `tonight-picks-full-refresh-btn`
- Network request to `/functions/v1/recommendations` with `force_refresh: true`
- New batch of ~100 movies generated
- Display resets to first 10 of new batch
- May contain some overlap with previous batch (fresh AI query)
- Tracking resets (partial refresh starts from 0)

**Test Data:**
- User with completed quiz

**Related Test IDs:** `tonight-picks-full-refresh-btn`, `tonight-picks-grid`

---

### 28. Mood button filtering

**Pass Conditions:**
- Load recommendations without mood selected
- Click mood button (e.g., `mood-btn-action` for "High-Octane Action")
- Mood button highlights/selected state
- Movies filter to match mood keywords
- If <10 matches in batch, fallback to new query with mood
- Grid updates with mood-appropriate movies
- Click clear button `mood-selection-clear-btn`
- Mood deselected
- Return to original recommendations

**Test Data:**
- User with diverse movie batch
- Test multiple mood buttons

**Related Test IDs:** `mood-selection-container`, `mood-btn-action`, `mood-btn-heartbreak`, `mood-btn-dark`, `mood-selection-clear-btn`, `tonight-picks-grid`

---

### 29. Personalization based on DNA and calibration

**Pass Conditions:**
- Create user with DNA type "heart"
- Add calibration data: liked actors (Tom Hanks, Sandra Bullock), rated movies (romantic comedies liked)
- Login and load recommendations
- Verify movies match DNA type themes (emotional, heartwarming)
- Verify movies feature calibrated actors when possible
- Verify movies similar to rated movies appear
- Match percentages `movie-card-match-percentage` are high (70%+)
- Recommendation reasons `movie-detail-reason` reference DNA and calibration

**Test Data:**
- User with complete quiz + calibration data

**Related Test IDs:** `movie-card-match-percentage`, `movie-detail-reason` (in modal)

---

### 30. Edge function failure fallback to TMDB trending

**Pass Conditions:**
- Simulate edge function failure (network error or 500 response)
- Recommendations still load
- Fallback to TMDB trending movies endpoint
- Grid displays 10 trending movies
- No error displayed to user
- Console warning logged (for debugging)

**Test Data:**
- Mock edge function to return error

**Related Test IDs:** `tonight-picks-grid`, `tonight-picks-error`

---

### 31. Anonymous user recommendations use device_id

**Pass Conditions:**
- Visit home page without authentication
- Device ID generated and stored in localStorage
- Recommendations request includes `device_id` parameter
- User ID is null
- Movies display normally
- Interactions tracked with device_id
- Refresh page - same device_id used
- Recommendations consistent for same device

**Test Data:**
- No authentication

**Related Test IDs:** `tonight-picks-grid`, localStorage inspection

---

## Search & Discovery Tests

### 32. Natural language search with valid query

**Pass Conditions:**
- Click search button `header-search-btn`
- Search modal `search-modal` opens
- Type query in input `search-modal-input`: "sci-fi movies about time travel"
- Debounce waits 800ms
- Loading indicator `search-modal-loading` appears
- Request sent to `/functions/v1/ai-movie-search`
- Results heading `search-modal-results-heading` appears
- Results grid `search-modal-results-grid` displays 5-8 movies
- Each movie enriched with TMDB data (poster, cast, streaming)
- Movies match query theme

**Test Data:**
- Query: "sci-fi movies about time travel"

**Related Test IDs:** `header-search-btn`, `search-modal`, `search-modal-input`, `search-modal-loading`, `search-modal-results-grid`

---

### 33. Search debounce behavior (800ms)

**Pass Conditions:**
- Open search modal
- Type "action" quickly
- Pause <800ms, type more characters
- No API request sent yet
- Wait 800ms after last keystroke
- Single API request sent with full query
- Prevents multiple rapid requests

**Test Data:**
- Query typed with pauses: "action movies"

**Related Test IDs:** `search-modal-input`, Network inspection

---

### 34. Search with <2 characters does not trigger

**Pass Conditions:**
- Open search modal
- Type single character: "a"
- Wait >800ms
- No API request sent
- No loading indicator
- No results displayed
- Tips section `search-modal-tips-section` still visible

**Test Data:**
- Query: "a"

**Related Test IDs:** `search-modal-input`, `search-modal-tips-section`

---

### 35. Search returns relevant results

**Pass Conditions:**
- Search for "romantic comedies from the 90s"
- Results contain movies matching:
  - Genre: Romance/Comedy
  - Decade: 1990s
- Result count `search-modal-results-count` displays correct number
- Each movie card shows relevant metadata
- Click movie opens detail modal with full info

**Test Data:**
- Query: "romantic comedies from the 90s"

**Related Test IDs:** `search-modal-results-count`, `search-modal-results-grid`, `movie-card-{movieId}`

---

### 36. Load more results appends without duplicates

**Pass Conditions:**
- Search returns initial 5-8 results
- Scroll to bottom or click load more button `search-modal-load-more-btn`
- New request with increased limit
- Additional movies appended to grid
- No duplicate movie cards (checked by title+year)
- Result count updates
- Can load more multiple times

**Test Data:**
- Query with many results: "action movies"

**Related Test IDs:** `search-modal-load-more-btn`, `search-modal-results-grid`, `search-modal-results-count`

---

### 37. Refresh results re-queries with same search

**Pass Conditions:**
- Perform search
- Results displayed
- Click refresh button `search-modal-refresh-btn`
- Loading indicator appears
- New API request with same query
- Results may differ (AI variation)
- Grid replaces with new results (not appended)

**Test Data:**
- Query: "movies like Inception"

**Related Test IDs:** `search-modal-refresh-btn`, `search-modal-loading`, `search-modal-results-grid`

---

### 38. Search error handling and retry

**Pass Conditions:**
- Simulate edge function error (network failure)
- Error message `search-modal-error` displays
- Error text user-friendly: "Unable to search movies"
- Retry button `search-modal-error-retry-btn` visible
- Click retry button
- Retries same search
- If successful, error clears and results display

**Test Data:**
- Mock search API to fail, then succeed

**Related Test IDs:** `search-modal-error`, `search-modal-error-retry-btn`

---

### 39. Empty search results display empty state

**Pass Conditions:**
- Search for nonsensical query: "asdfghjkl"
- No results returned from AI
- No results message `search-modal-no-results` displays
- Message suggests trying different query
- Tips section may reappear
- Can search again without closing modal

**Test Data:**
- Query: "asdfghjkl"

**Related Test IDs:** `search-modal-no-results`, `search-modal-tips-section`

---

## User Collections Tests

### 40. Add movie to watchlist

**Pass Conditions:**
- Login as authenticated user
- Navigate to Tonight's Picks
- Locate movie card with watchlist button `movie-card-watchlist-btn`
- Button shows "Add to Watchlist" (not added state)
- Click button
- Button changes to "In Watchlist" (added state)
- Record created in `user_movie_interactions` table:
  - user_id matches current user
  - movie_id, movie_title, movie_year correct
  - status = 'watchlist'
- Button state persists after page refresh

**Test Data:**
- Authenticated user, movie ID 550 ("Fight Club")

**Related Test IDs:** `movie-card-watchlist-btn`, `movie-card-{movieId}`

---

### 41. Remove movie from watchlist

**Pass Conditions:**
- Movie already in watchlist (button shows "In Watchlist")
- Click watchlist button `movie-card-watchlist-btn`
- Button changes to "Add to Watchlist"
- Record deleted from `user_movie_interactions` table
- Movie removed from Watchlist page
- State persists after refresh

**Test Data:**
- Pre-added watchlist item

**Related Test IDs:** `movie-card-watchlist-btn`

---

### 42. Mark movie as seen

**Pass Conditions:**
- Locate movie card with "Saw This" button `movie-card-saw-this-btn`
- Button shows "Saw This" (not seen state)
- Click button
- Button changes to "Seen" (marked state)
- Record created/updated in `user_movie_interactions`:
  - status = 'seen'
- Button state persists

**Test Data:**
- Movie ID 13 ("Forrest Gump")

**Related Test IDs:** `movie-card-saw-this-btn`, `movie-card-{movieId}`

---

### 43. Unmark movie as seen

**Pass Conditions:**
- Movie already marked as seen
- Click "Seen" button `movie-card-saw-this-btn`
- Button reverts to "Saw This"
- Record deleted or status updated
- State persists

**Test Data:**
- Pre-marked seen movie

**Related Test IDs:** `movie-card-saw-this-btn`

---

### 44. Rate movie with 1-10 stars

**Pass Conditions:**
- Locate movie card rating button `movie-card-rate-btn`
- Click button
- Rating dropdown `movie-card-rating-dropdown` appears
- Dropdown shows 1-10 star options
- Select rating (e.g., 8 stars)
- Submit button `movie-card-rate-submit-btn` visible
- Click submit
- Record created/updated in `user_movie_interactions`:
  - status = 'rated'
  - rating = 8
- Button shows "Rated: 8/10"
- Dropdown closes

**Test Data:**
- Movie ID 550, rating 8

**Related Test IDs:** `movie-card-rate-btn`, `movie-card-rating-dropdown`, `movie-card-rate-submit-btn`

---

### 45. Change movie rating

**Pass Conditions:**
- Movie already rated (shows "Rated: 8/10")
- Click rating button
- Dropdown opens with current rating selected
- Select different rating (e.g., 6 stars)
- Submit
- Record updated in database (rating = 6)
- Button updates to "Rated: 6/10"

**Test Data:**
- Pre-rated movie, change from 8 to 6

**Related Test IDs:** `movie-card-rate-btn`, `movie-card-rating-dropdown`, `movie-card-rate-submit-btn`

---

### 46. Remove movie rating

**Pass Conditions:**
- Movie already rated
- Click rating button
- Dropdown opens
- Cancel button `movie-card-rate-cancel-btn` or "Remove Rating" option
- Click cancel/remove
- Record deleted from database or rating set to null
- Button reverts to "Rate"

**Test Data:**
- Pre-rated movie

**Related Test IDs:** `movie-card-rate-btn`, `movie-card-rate-cancel-btn`

---

### 47. Watchlist page displays all saved movies

**Pass Conditions:**
- Create 5 watchlist items via database
- Navigate to Watchlist page
- Page title `watchlist-page-title` visible
- Movie count `watchlist-page-count` shows "5 movies"
- Grid `watchlist-page-grid` displays all 5 movie cards
- Each movie enriched with TMDB data (poster, cast, year, rating)
- Movies sorted by added date (most recent first)
- Click movie opens detail modal

**Test Data:**
- 5 pre-added watchlist movies

**Related Test IDs:** `watchlist-page-container`, `watchlist-page-title`, `watchlist-page-count`, `watchlist-page-grid`, `movie-card-{movieId}`

---

### 48. Empty watchlist shows empty state

**Pass Conditions:**
- User has no watchlist items
- Navigate to Watchlist page
- Empty state container `watchlist-page-empty-state` visible
- Empty icon `watchlist-page-empty-icon` displayed
- Empty heading `watchlist-page-empty-heading`: "Your watchlist is empty"
- Empty description `watchlist-page-empty-description` suggests adding movies
- Discover button `watchlist-page-discover-btn` visible
- Click button navigates to home page

**Test Data:**
- User with no watchlist items

**Related Test IDs:** `watchlist-page-empty-state`, `watchlist-page-empty-icon`, `watchlist-page-empty-heading`, `watchlist-page-empty-description`, `watchlist-page-discover-btn`

---

### 49. Anonymous user interactions use device_id

**Pass Conditions:**
- Visit home page without login
- Device ID generated in localStorage
- Add movie to watchlist
- Record created in `user_movie_interactions`:
  - user_id = null
  - device_id = generated UUID
- Navigate to Watchlist page
- Watchlist displays movies added with same device_id
- Refresh page - device_id persists
- Watchlist items still visible

**Test Data:**
- Anonymous browsing session

**Related Test IDs:** `movie-card-watchlist-btn`, `watchlist-page-grid`, localStorage inspection

---

### 50. Multiple interaction types on same movie

**Pass Conditions:**
- Add movie to watchlist (status = 'watchlist')
- Mark same movie as seen (status changes to 'seen')
- Watchlist button resets to "Add to Watchlist"
- Seen button shows "Seen"
- Rate movie (status changes to 'rated', rating = 7)
- Single record in database with latest status
- All button states reflect current status
- Upsert strategy prevents duplicate records

**Test Data:**
- Movie ID 550, multiple interactions in sequence

**Related Test IDs:** `movie-card-watchlist-btn`, `movie-card-saw-this-btn`, `movie-card-rate-btn`

---

## Movie Details Tests

### 51. Open movie detail modal from grid

**Pass Conditions:**
- Navigate to Tonight's Picks or Watchlist
- Click movie card `movie-card-{movieId}` (anywhere except buttons)
- Detail modal `movie-detail-modal` opens
- Modal overlays page
- Modal contains all movie information
- Background dimmed/blurred
- Click close button `movie-detail-close-btn` or outside modal
- Modal closes
- Return to original page

**Test Data:**
- Any movie card

**Related Test IDs:** `movie-card-{movieId}`, `movie-detail-modal`, `movie-detail-close-btn`

---

### 52. Display all movie information fields

**Pass Conditions:**
- Open movie detail modal
- Poster image `movie-detail-poster` visible (or placeholder)
- Title `movie-detail-title` displays movie name
- Year `movie-detail-year` displays release year
- Rating `movie-detail-rating` shows TMDB vote average
- Runtime `movie-detail-runtime` displays duration
- Genres `movie-detail-genres` display as badges
- Overview `movie-detail-overview` displays plot summary
- All fields populated with TMDB data

**Test Data:**
- Movie with complete TMDB data (e.g., "The Matrix")

**Related Test IDs:** `movie-detail-poster`, `movie-detail-title`, `movie-detail-year`, `movie-detail-rating`, `movie-detail-runtime`, `movie-detail-genres`, `movie-detail-overview`

---

### 53. Display cast and director

**Pass Conditions:**
- Open movie detail modal
- Director section `movie-detail-director` displays director name
- Cast section `movie-detail-cast` displays top 6 cast members
- Cast members shown as comma-separated list or individual elements
- Data fetched from TMDB credits API

**Test Data:**
- Movie with known cast/director (e.g., "Inception" - Christopher Nolan)

**Related Test IDs:** `movie-detail-director`, `movie-detail-cast`

---

### 54. Display streaming availability

**Pass Conditions:**
- Open movie detail for streaming-available movie
- Streaming heading `movie-detail-streaming-heading` visible: "Watch on"
- Streaming providers `movie-detail-streaming-providers` display provider logos
- Providers are US-based (Netflix, Hulu, Prime Video, etc.)
- Data from TMDB Watch Providers API
- For unavailable movies, section hidden or shows "Not available"

**Test Data:**
- Movie available on Netflix or Prime

**Related Test IDs:** `movie-detail-streaming-heading`, `movie-detail-streaming-providers`

---

### 55. Display match percentage and recommendation reason

**Pass Conditions:**
- Open movie detail from recommendations (not search)
- Match percentage badge visible on card `movie-card-match-percentage`
- Percentage shown as 0-100 (e.g., "85% match")
- Recommendation reason `movie-detail-reason` in modal
- Reason explains why recommended based on DNA/calibration
- Reason text is personalized, not generic

**Test Data:**
- Personalized recommendation for user with DNA type

**Related Test IDs:** `movie-card-match-percentage`, `movie-detail-reason`

---

### 56. Watch trailer link opens YouTube

**Pass Conditions:**
- Open movie detail with trailer available
- Trailer link `movie-detail-trailer-link` visible: "Watch Trailer"
- Click link
- New tab/window opens with YouTube video
- Video is official trailer for movie
- If no trailer available, link not shown

**Test Data:**
- Recent movie with trailer (e.g., "Oppenheimer")

**Related Test IDs:** `movie-detail-trailer-link`

---

### 57. TMDB link opens movie page

**Pass Conditions:**
- Open movie detail modal
- TMDB link `movie-detail-tmdb-link` visible: "View on TMDB"
- Click link
- New tab opens with TMDB movie page
- URL format: `https://www.themoviedb.org/movie/{id}`
- Correct movie page loads

**Test Data:**
- Any movie

**Related Test IDs:** `movie-detail-tmdb-link`

---

### 58. Missing poster shows placeholder

**Pass Conditions:**
- Open movie detail for movie without poster image
- Poster area `movie-detail-poster` displays placeholder
- Placeholder shows "No Poster Available" text or generic image
- Modal still functional
- All other data displays normally

**Test Data:**
- Movie with null poster_path in TMDB

**Related Test IDs:** `movie-detail-poster`

---

## System Quality Tests

### 59. Loading states display correctly across features

**Pass Conditions:**
- Navigate to each major feature:
  - Tonight's Picks: Loading skeleton `tonight-picks-loading-skeleton` appears before movies load
  - Search: Loading spinner `search-modal-loading` appears during search
  - Watchlist: Loading state `watchlist-page-loading` appears while fetching
  - Quiz calibration: Loading indicators for people/movies
- Loading states appear immediately on action
- Loading states clear when data arrives
- No flash of empty state before loading

**Test Data:**
- Slow network simulation (throttle to 3G)

**Related Test IDs:** `tonight-picks-loading-skeleton`, `search-modal-loading`, `watchlist-page-loading`, `calibration-people-loading`, `calibration-movies-loading`

---

### 60. Error states with retry functionality

**Pass Conditions:**
- Simulate network errors for:
  - Recommendations fetch: Error `tonight-picks-error` appears with retry button `tonight-picks-error-retry-btn`
  - Search: Error `search-modal-error` with retry `search-modal-error-retry-btn`
  - Watchlist: Error `watchlist-page-error` with retry link `watchlist-page-error-retry-link`
- Click retry button
- Operation retries successfully
- Error clears when successful
- User-friendly error messages (no technical jargon)

**Test Data:**
- Mock API failures

**Related Test IDs:** `tonight-picks-error`, `tonight-picks-error-retry-btn`, `search-modal-error`, `search-modal-error-retry-btn`, `watchlist-page-error`, `watchlist-page-error-retry-link`

---

### 61. Empty states display appropriate messaging

**Pass Conditions:**
- Test empty states:
  - Empty watchlist: `watchlist-page-empty-state` with helpful message and CTA
  - No search results: `search-modal-no-results` with suggestion to try different query
  - No recommendations (edge case): `tonight-picks-empty-state` with fallback action
- Each empty state has:
  - Clear heading
  - Helpful description
  - Action button/link to resolve
- Consistent visual design across empty states

**Test Data:**
- Empty data scenarios for each feature

**Related Test IDs:** `watchlist-page-empty-state`, `search-modal-no-results`, `tonight-picks-empty-state`

---

### 62. Responsive design on mobile viewport

**Pass Conditions:**
- Set viewport to mobile (375x667 - iPhone SE)
- Navigate through all pages:
  - Home page: Header, quiz CTA, Tonight's Picks grid responsive
  - Quiz page: Questions fit viewport, buttons accessible
  - Watchlist page: Grid adapts to single column
  - Search modal: Full-screen on mobile
  - Movie detail modal: Scrollable, readable
- No horizontal scroll
- Touch targets ≥44x44px
- Text readable without zoom
- Images scale appropriately

**Test Data:**
- All pages and features

**Related Test IDs:** All components responsive

---

### 63. Responsive design on tablet viewport

**Pass Conditions:**
- Set viewport to tablet (768x1024 - iPad)
- Layout adapts to tablet:
  - Grids show 2-3 columns
  - Header navigation visible
  - Modals centered, appropriate width
  - Touch-friendly button sizes
- No mobile-specific compromises (e.g., hamburger menu if not needed)
- Optimal use of space

**Test Data:**
- All pages and features

**Related Test IDs:** All components responsive

---

### 64. Device ID persists in localStorage

**Pass Conditions:**
- Visit site as anonymous user
- Device ID generated via `crypto.randomUUID()`
- ID stored in localStorage with key `device_id`
- Refresh page
- Same device ID retrieved from localStorage
- Add movie to watchlist with device_id
- Close browser completely
- Reopen and visit site
- Device ID still present
- Watchlist items still associated

**Test Data:**
- Anonymous browsing session

**Related Test IDs:** localStorage inspection

---

### 65. Edge function timeout handling

**Pass Conditions:**
- Simulate edge function timeout (>30s response)
- Request times out gracefully
- Error state displays: "Request timed out"
- Retry option available
- No application crash
- Fallback to TMDB trending if recommendations timeout

**Test Data:**
- Mock slow edge function

**Related Test IDs:** `tonight-picks-error`, `search-modal-error`

---

### 66. TMDB API failure graceful degradation

**Pass Conditions:**
- Simulate TMDB API failures:
  - Movie search fails: Skip movie, continue with others
  - Image loading fails: Display placeholder
  - Credits API fails: Hide cast/director section
  - Watch providers fails: Show "Streaming info unavailable"
- Application continues functioning
- No crashes or blank screens
- User notified where appropriate

**Test Data:**
- Mock TMDB API errors

**Related Test IDs:** Various movie detail fields

---

### 67. Concurrent operations do not conflict

**Pass Conditions:**
- Perform multiple operations simultaneously:
  - Add 3 movies to watchlist rapidly
  - Search while recommendations loading
  - Navigate pages during data fetches
- All operations complete successfully
- No race conditions cause data loss
- Button states update correctly
- Database records created for all actions

**Test Data:**
- Rapid user interactions

**Related Test IDs:** All interactive elements

---

### 68. Quiz completion updates profile correctly

**Pass Conditions:**
- Start quiz as user with null `dna_type`
- Complete all questions
- Complete calibration (or skip)
- Finish quiz
- Quiz complete screen `quiz-complete-container` displays
- DNA result visible with archetype
- Database updates:
  - Profile `dna_type` set to calculated archetype
  - Profile `intl_openness` set based on Q6
  - Quiz responses saved to `cinematic_dna_quiz_responses`
  - Calibration data saved to respective tables
- Navigate to home page
- DNA section displays new result
- Recommendations reflect new DNA type

**Test Data:**
- New user completing quiz

**Related Test IDs:** `quiz-complete-container`, `quiz-complete-dna-result`, `home-dna-section`, `tonight-picks-grid`

---

## Notes

### Email Verification
Email verification is tested **manually** during development, not in automated E2E tests. Tests use pre-verified users created via Supabase Admin API with `email_confirm: true`. See [Supawright.md](./Supawright.md) for implementation details.

### Test Data Management
All tests use Supawright for automatic database cleanup. Test users and data are created before each test and cleaned up after, ensuring test isolation.

### Test Execution
- Run all tests: `npm run test:e2e`
- Run specific suite: `npm run test:e2e:auth`, `npm run test:e2e:quiz`, etc.
- Headed mode: `npm run test:e2e:headed`
- Trace mode (full debugging): `npm run test:e2e:trace`

### Test Reports
After test runs, comprehensive reports are generated in `test-results/{TEST_RUN_ID}/README.md` with:
- Test summary statistics
- Failed test diagnostics
- Screenshots and traces
- Console logs and network failures

See [Testing.md](../Testing.md) for complete testing guidelines and best practices.

---

**Last Updated:** 2025-11-23
**Total Tests:** 68
**Version:** 1.0.0
