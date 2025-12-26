drop trigger if exists "update_user_step_progress_updated_at" on "public"."user_step_progress";

drop policy "Sponsees can view their sponsor's slip ups" on "public"."slip_ups";

drop policy "Sponsors can create custom templates" on "public"."task_templates";

drop policy "Template owners can delete their templates" on "public"."task_templates";

drop policy "Template owners can update their templates" on "public"."task_templates";

alter table "public"."profiles" drop constraint "profiles_role_check";

alter table "public"."tasks" drop constraint "tasks_step_number_check";

drop index if exists "public"."idx_task_templates_is_default";

drop index if exists "public"."idx_task_templates_step_number";

alter table "public"."profiles" drop column "role";

alter table "public"."task_templates" alter column "is_default" drop not null;

CREATE INDEX idx_profiles_timezone ON public.profiles USING btree (timezone);

CREATE INDEX idx_task_templates_step ON public.task_templates USING btree (step_number);

alter table "public"."tasks" add constraint "tasks_step_number_check" CHECK (((step_number >= 1) AND (step_number <= 12))) not valid;

alter table "public"."tasks" validate constraint "tasks_step_number_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.reset_e2e_test_data()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Reset tasks to assigned status
  UPDATE public.tasks
  SET status = 'assigned', completed_at = NULL, completion_notes = NULL
  WHERE sponsee_id = '11111111-1111-1111-1111-111111111111'
    AND id != '55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Keep one task as completed for testing
  UPDATE public.tasks
  SET status = 'completed', completed_at = NOW()
  WHERE id = '55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Clean up onboarding test user if exists
  DELETE FROM public.profiles WHERE email = 'e2e-onboarding@sobers-test.com';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_step_progress_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Delete the user from auth.users
  -- This will cascade to profiles and other tables with ON DELETE CASCADE
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;


  create policy "Sponsees can view their sponsors' slip ups"
  on "public"."slip_ups"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.sponsor_sponsee_relationships
  WHERE ((sponsor_sponsee_relationships.sponsee_id = auth.uid()) AND (sponsor_sponsee_relationships.sponsor_id = slip_ups.user_id) AND (sponsor_sponsee_relationships.status = 'active'::text)))));


CREATE TRIGGER trigger_update_user_step_progress_updated_at BEFORE UPDATE ON public.user_step_progress FOR EACH ROW EXECUTE FUNCTION public.update_user_step_progress_updated_at();


