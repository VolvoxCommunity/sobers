/*
  # Literature Tables

  Creates tables for literature tracking:
  - literature_books: Book metadata (seeded)
  - literature_chapters: Chapter list per book (seeded)
  - user_literature_books: User's visible/hidden books
  - user_literature_progress: Chapter completion tracking
*/

-- Literature books
CREATE TABLE IF NOT EXISTS public.literature_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  program text NOT NULL CHECK (program IN ('aa', 'na')),
  chapter_count int NOT NULL CHECK (chapter_count >= 1),
  external_url text,
  sort_order int NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Literature chapters
CREATE TABLE IF NOT EXISTS public.literature_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.literature_books(id) ON DELETE CASCADE,
  chapter_number int NOT NULL CHECK (chapter_number >= 1),
  title text NOT NULL,
  page_range text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(book_id, chapter_number)
);

-- User's visible books
CREATE TABLE IF NOT EXISTS public.user_literature_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.literature_books(id) ON DELETE CASCADE,
  is_visible boolean NOT NULL DEFAULT true,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- User chapter progress
CREATE TABLE IF NOT EXISTS public.user_literature_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.literature_chapters(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, chapter_id)
);

-- Trigger for updated_at (idempotent)
DROP TRIGGER IF EXISTS update_literature_books_updated_at ON public.literature_books;
CREATE TRIGGER update_literature_books_updated_at
  BEFORE UPDATE ON public.literature_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.literature_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.literature_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_literature_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_literature_progress ENABLE ROW LEVEL SECURITY;

-- literature_books: Anyone can read
CREATE POLICY "Anyone can read literature books"
  ON public.literature_books FOR SELECT
  USING (true);

-- literature_chapters: Anyone can read
CREATE POLICY "Anyone can read literature chapters"
  ON public.literature_chapters FOR SELECT
  USING (true);

-- user_literature_books: Users can manage their own
CREATE POLICY "Users can read own literature books"
  ON public.user_literature_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own literature books"
  ON public.user_literature_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own literature books"
  ON public.user_literature_books FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own literature books"
  ON public.user_literature_books FOR DELETE
  USING (auth.uid() = user_id);

-- user_literature_progress: Users can manage their own
CREATE POLICY "Users can read own literature progress"
  ON public.user_literature_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own literature progress"
  ON public.user_literature_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own literature progress"
  ON public.user_literature_progress FOR DELETE
  USING (auth.uid() = user_id);
