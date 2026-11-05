import type { Metadata } from "next";
import { Landing, landingMetadata } from "../landing";

export async function generateMetadata(props: PageProps<"/[locale]/jobs/[skill]">): Promise<Metadata> {
  const { skill } = await props.params;
  return landingMetadata(skill);
}

export default async function SkillJobsPage(props: PageProps<"/[locale]/jobs/[skill]">) {
  const { skill } = await props.params;
  return <Landing skillSlug={skill} searchParams={props.searchParams} />;
}
