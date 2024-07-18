import { graphql, PageProps } from "gatsby";
import {Grid, Box, Heading } from "@yamada-ui/react";
import {ArticleCard} from "@/features/ArticleList/ArticleCard";
import * as React from "react";
import {Pager} from "@/components/Pager";
import {Layout} from "@/components/Layout";
import { ArticleListPageContext } from "../../gatsby-node"
import {ImageDataLike} from "gatsby-plugin-image/dist/src/components/hooks";

interface Tag {
    id: string
    name: string;
}

interface ArticleCardData {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    tags: Tag[];
    imageData?: ImageDataLike;
    articleExcerpt?: string;
}

const ArticleList = ({ data, pageContext }: PageProps<Queries.ArticleListQueryQuery, ArticleListPageContext>) => {
    const articleCardDataList = (() => {
        return data.miyamotoday.articles.edges.map((articleEdge): ArticleCardData => {
            const imageDataEdge = data.allFile.edges.find((edge: { node: { id: string; }; }) => edge.node.id === `ArticleImage:${articleEdge.cursor}`);
            const imageData = imageDataEdge?.node.childImageSharp || undefined
            const markdownRemarkNode = data.allMarkdownRemark.nodes.find((n) => n.frontmatter?.id == articleEdge.cursor)
            const articleExcerpt = markdownRemarkNode?.excerpt ?? undefined
            console.log(articleExcerpt)

            const articleCardData: ArticleCardData = {
                id: articleEdge.cursor,
                title: articleEdge.node.title,
                createdAt: articleEdge.node.createdAt,
                updatedAt: articleEdge.node.updatedAt,
                tags: articleEdge.node.tags.edges.map((edge) => { return {id: edge.node.id, name: edge.node.name} }),
                imageData: imageData,
                articleExcerpt: articleExcerpt
            }
            return articleCardData
        })
    })()

    return (
        <Layout>
            <main>
                <Heading className={"text-black text-3xl font-bold"} paddingBottom={"md"}>Articles</Heading>
                <Grid templateColumns={"repeat(auto-fill, minmax(280px, 1fr))"}>
                    {articleCardDataList.map((data, i) => (
                        <ArticleCard {...data}/>
                    ))}
                </Grid>
                <Box paddingTop={"lg"} paddingBottom={"sm"}>
                    <Pager currentPage={pageContext.currentPage} pagePrefix={"pages"} perPage={pageContext.perPage}
                           totalItems={pageContext.totalItems}/>
                </Box>
            </main>
        </Layout>
)
}

export const query = graphql`
    query ArticleListQuery($cursor: String, $perPage: Int, $imageCursors: [String], $markdownCursors: [String]) {
        miyamotoday {
            articles(after: $cursor, first: $perPage) {
                edges {
                    cursor
                    node {
                        title
                        createdAt
                        updatedAt
                        tags {
                            edges {
                                node {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
        allMarkdownRemark(filter: {frontmatter: {id: {in: $markdownCursors}}}) {
            nodes{
                excerpt
                frontmatter {
                    id
                }
            }
        }
        allFile(filter: {id: {in: $imageCursors}}) {
            edges {
                node {
                    id
                    childImageSharp {
                        gatsbyImageData(width: 600, height: 600, placeholder: BLURRED, quality: 100, layout: CONSTRAINED)
                    }
                }
            }
        }
    }
`;

export default ArticleList
