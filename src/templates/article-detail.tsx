import {graphql, HeadProps, Link, PageProps} from "gatsby";
import * as React from "react";
import { ReactNode } from "react";
import { Layout, SideNavRenderProps } from "@/components/Layout";
import { Image } from "@/components/Image";
import { ArticleDetailPageContext } from "../../gatsby-node"
import {
    Heading,
    Tag,
    useMediaQuery,
    Box,
    Accordion,
    AccordionItem,
    AccordionLabel,
    AccordionPanel
} from "@yamada-ui/react";
import { Icon as FontAwesomeIcon } from "@yamada-ui/fontawesome"
import {faCalendarDay, faListUl} from "@fortawesome/free-solid-svg-icons"
import {format} from "@formkit/tempo";
import SEO from "@/components/SEO";
import {getSrc} from "gatsby-plugin-image";


const ArticleDetail = ({ data, pageContext }: PageProps<Queries.ArticleDetailQueryQuery, ArticleDetailPageContext>) => {
    const [isLarge] = useMediaQuery([
        "(min-width: 1280px)",
    ])

    const allFileConnection = data.allFile

    const markdownRemark = data.markdownRemark
    if (!markdownRemark) {
        return <></>
    }

    const frontmatter = markdownRemark.frontmatter
    if (!frontmatter) {
        return <></>
    }

    const createdAt = format(new Date(frontmatter.createdAt ?? ""), "YYYY/MM/DD")

    return (
        <Layout scroll={true} isLarge={isLarge} sideNavRightRender={ isLarge ? ArticleTOC(markdownRemark.tableOfContents ?? "") : undefined}>
            <main>
                <Image allFileConnectrion={allFileConnection} alt={`ArticleImage:${pageContext.cursor}`} objectFit={"cover"} />
                <Heading className={"text-black text-3xl font-bold"} paddingBottom={"md"}>{frontmatter.title}</Heading>
                {frontmatter.tags?.map((tag) => (
                    <Tag as={Link} size={"md"} id={`${tag?.id}-${tag?.id}`} to={`/tags/${tag?.id}`} colorScheme={"gray"}>#{tag?.name}</Tag>
                ))}
                <Box paddingTop={"md"} paddingBottom={"md"}><FontAwesomeIcon icon={faCalendarDay} />{createdAt}</Box>
                <article className={"markdown"}>
                    {!isLarge ? ArticleTOC(markdownRemark.tableOfContents ?? "")({isLarge: isLarge}) : <></>}
                    <div
                        dangerouslySetInnerHTML={{
                            __html: markdownRemark.html ?? ""
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
            excerpt(pruneLength: 140, truncate: true)
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
                    gatsbyImageData(width: 1200, height: 630, placeholder: BLURRED, quality: 100)
                }
            }
        }
    }
`;

export default ArticleDetail

export const Head = ({ data, location }: HeadProps<Queries.ArticleDetailQueryQuery>) => {
    const title = data.markdownRemark?.frontmatter?.title ?? undefined
    const description = data.markdownRemark?.excerpt ?? undefined

    const childImageSharp = data.allFile?.nodes.at(0)?.childImageSharp
    const imageSrc = childImageSharp ? getSrc(childImageSharp) : undefined

    const path = location.pathname

    return (
        <SEO path={path} title={title} image={imageSrc} description={description} />
    )
}