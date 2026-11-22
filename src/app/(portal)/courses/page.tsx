import Link from "next/link";
import { Plus } from "lucide-react";
import { pageProfile } from "@/lib/server/auth";
import { studentData, teacherCourses } from "@/lib/server/dashboards";
import { PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { CourseLibrary } from "@/components/course-library";
export default async function Courses() {
  const profile = await pageProfile();
  const teacher = profile.role === "teacher";
  const data = teacher ? await teacherCourses(profile.id) : await studentData(profile.id);
  return <><PageHeading eyebrow={teacher ? "COURSES YOU SHARE" : "A PATH FOR YOUR CURIOSITY"} title="Your courses" description={teacher ? "Create a course from a class syllabus, review the topics AI prepares, and publish it to your connected students." : "Class 10, 11 and 12 in all five subjects, plus courses from your teacher and private courses of your own. Choose Beginner or Intermediate and start with a short diagnostic."} action={<Button asChild><Link href="/courses/upload"><Plus />{teacher ? "Add course" : "Create course"}</Link></Button>} /><CourseLibrary data={data} role={profile.role} ownerId={profile.id} /></>;
}
