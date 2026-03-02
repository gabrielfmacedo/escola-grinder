import { createClient } from '@/lib/supabase/server'
import ConteudosClient from '@/components/conteudos/ConteudosClient'
import type { PlanType } from '@/lib/supabase/types'

export default async function ConteudosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: subscription },
    { data: courses },
    { data: progress },
    { data: paths },
    { data: enrollments },
    { data: tags },
    { data: courseTags },
    { data: lessonTags },
  ] = await Promise.all([
    supabase.from('subscriptions').select('plan_id, plans(type)').eq('user_id', user!.id).eq('status', 'active').single(),
    supabase.from('courses').select('id, title, slug, description, thumbnail_url, required_plan, order_index, modules(id, lessons(id, title))').eq('is_published', true).order('order_index'),
    supabase.from('lesson_progress').select('lesson_id, completed').eq('user_id', user!.id),
    supabase.from('learning_paths').select('id, title, slug, description, thumbnail_url, required_plan, learning_path_courses(courses(id, modules(lessons(id))))'),
    supabase.from('learning_path_enrollments').select('learning_path_id').eq('user_id', user!.id),
    supabase.from('tags').select('*').order('name'),
    supabase.from('course_tags').select('course_id, tag_id'),
    supabase.from('lesson_tags').select('lesson_id, tag_id'),
  ])

  const userPlan: PlanType = (subscription?.plans as { type: PlanType } | null)?.type ?? 'basic'

  return (
    <ConteudosClient
      courses={courses ?? []}
      learningPaths={paths ?? []}
      completedLessonIds={progress?.filter(p => p.completed).map(p => p.lesson_id) ?? []}
      enrolledPathIds={enrollments?.map(e => e.learning_path_id) ?? []}
      userPlan={userPlan}
      tags={tags ?? []}
      courseTags={courseTags ?? []}
      lessonTags={lessonTags ?? []}
    />
  )
}
