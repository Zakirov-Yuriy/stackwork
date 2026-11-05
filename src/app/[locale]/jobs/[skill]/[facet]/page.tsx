import type { Metadata } from "next";
import { Landing, landingMetadata } from "../../landing";

export async function generateMetadata(props: PageProps<"/[locale]/jobs/[skill]/[facet]">): Promise<Metadata> {
  const { skill, facet } = await props.params;
  return landingMetadata(skill, facet);
}

export default async function SkillFacetJobsPage(props: PageProps<"/[locale]/jobs/[skill]/[facet]">) {
  const { skill, facet } = await props.params;
  return <Landing skillSlug={skill} facetSlug={facet} searchParams={props.searchParams} />;
}
