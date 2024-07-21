import { graphql, Link, PageProps } from "gatsby";
import * as React from "react";
import { ReactNode } from "react";
import { Layout, SideNavRenderProps } from "@/components/Layout";
import { ArticleDetailPageContext } from "../../gatsby-node"
import { Heading, Tag, useMediaQuery, Box, Accordion, AccordionItem, AccordionLabel, AccordionPanel } from "@yamada-ui/react";
import { Icon as FontAwesomeIcon } from "@yamada-ui/fontawesome"
import { faListUl } from "@fortawesome/free-solid-svg-icons"
import { GatsbyImage, getImage } from "gatsby-plugin-image";


const ArticleDetail = ({ data, pageContext }: PageProps<Queries.ArticleDetailQueryQuery, ArticleDetailPageContext>) => {
    const [isLarge] = useMediaQuery([
        "(min-width: 1280px)",
    ])

    const gatsbyImage = (() => {
        const node = data.allFile?.nodes?.at(0)
        if (!node) {
            return <></>
        }
        const image = node.childImageSharp ? getImage(node.childImageSharp) : undefined
        return image ? <GatsbyImage image={image} alt={`ArticleImage:`} objectFit={"cover"} />: <></>
    })()

    return (
        <Layout scroll={true} isLarge={isLarge} sideNavRightRender={ isLarge ? ArticleTOC(data.markdownRemark?.tableOfContents ?? "") : undefined}>
            <main>
                <Heading className={"text-black text-3xl font-bold"} paddingBottom={"md"}>{data.markdownRemark?.frontmatter?.title}</Heading>
                {data.markdownRemark?.frontmatter?.tags?.map((tag) => (
                    <Tag as={Link} size={"md"} id={`${tag?.id}-${tag?.id}`} to={`/tags/${tag?.id}`} paddingRight={"sm"}>#{tag?.name}</Tag>
                ))}
                {gatsbyImage}
                <article className={"markdown"}>
                    {!isLarge ? ArticleTOC(data.markdownRemark?.tableOfContents ?? "")({isLarge: isLarge}) : <></>}
                    <div
                        dangerouslySetInnerHTML={{
                            __html: data.markdownRemark?.html ?? ""
                        }}
                    ></div>
                </article>
            </main>
        </Layout>
    )
}

const ArticleTOC = (toc: string): (prop: SideNavRenderProps) => React.ReactNode => {
    return ({isLarge}: SideNavRenderProps): ReactNode => {
        return (
            <>
                {
                    isLarge ?
                        <Box paddingRight={"lg"} w={"full"} top={0}>
                            <Heading paddingBottom={"md"}><FontAwesomeIcon icon={faListUl} paddingRight={"sm"}/>目次</Heading>
                            <Box borderBlock={"solid"} writingMode={"horizontal-tb"}>
                                <div className={"side-toc"} dangerouslySetInnerHTML={{__html: toc}}></div>
                            </Box>
                        </Box> :
                        <div>
                            <Accordion isToggle>
                                <AccordionItem>
                                <AccordionLabel className={"text-black text-2xl font-bold"}><FontAwesomeIcon icon={faListUl} paddingRight={"sm"}/>目次</AccordionLabel>
                                <AccordionPanel>
                                        <div dangerouslySetInnerHTML={{__html: toc}}></div>
                                </AccordionPanel>
                                </AccordionItem>
                            </Accordion>
                        </div>
                }
            </>
        )
    }
}

export const query = graphql`
    query ArticleDetailQuery($cursor: String!, $imageCursor: String) {
        markdownRemark(frontmatter: {id: {eq: $cursor}}) {
            html
            tableOfContents
            frontmatter {
                id
                title
                createdAt
                updatedAt
                tags {
                    id
                    name
                }
            }
        }
        allFile(filter: {id: {eq: $imageCursor}}) {
            nodes {
                id
                childImageSharp {
                    gatsbyImageData(width: 1280, height: 700, placeholder: BLURRED, quality: 100)
                }
            }
        }
    }
`;

export default ArticleDetail
