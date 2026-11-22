import { pageProfile } from "@/lib/server/auth";
import { PageHeading } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SyllabusUpload } from "@/components/course-actions";
export default async function UploadCourse() {
  const profile = await pageProfile();
  const teacher = profile.role === "teacher";
  return <div className="mx-auto max-w-3xl"><PageHeading eyebrow={teacher ? "BUILD A COURSE FOR YOUR STUDENTS" : "YOUR SYLLABUS, YOUR PATH"} title={teacher ? "Add a course" : "Create a course"} description={teacher ? "Choose the class and subject, then upload or paste the syllabus. AI organizes it into connected topics; it becomes visible to connected students when you publish." : "Choose your class and subject, then upload or type a syllabus. AI organizes it into connected topics for your private course."} /><Card><CardHeader><CardTitle>What will this course cover?</CardTitle></CardHeader><CardContent><SyllabusUpload role={profile.role} defaultGrade={profile.grade} /></CardContent></Card></div>;
}
