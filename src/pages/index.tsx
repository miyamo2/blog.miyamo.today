import * as React from "react"
import { HeadFC, Link, PageProps, graphql } from "gatsby"
import { Layout } from '../components/Layout';
import {ArticleListCard2} from "../features/ArticleList/card";

const IndexPage = ({data}: PageProps<Queries.Query>) => {
    return (
        <Layout>
            <div className={"flex justify-center items-center"}>
                <div className={"hidden lg:flex lg:w-1/6"}>

                </div>
                <div className={"lg:w-4/6"}>
                    <h1 className={"text-black text-lg md:text-xl lg:text-2xl font-bold"}>Articles</h1>
                    <div className={"lg:flex justify-center items-center"}>
                        {data.miyamo2blog.articles.edges.map((edge, i) => (
                            <ArticleListCard2
                            id={edge.cursor}
                            title={edge.node.title}
                            thumbnailUrl={edge.node.thumbnailUrl || ""}
                            createdAt={edge.node.createdAt}
                            updatedAt={edge.node.updatedAt}
                            tagNames={edge.node.tags.edges.map((edge) => edge.node.name)}/>
                        ))}
                    </div>
                </div>
                <div className={"hidden lg:flex lg:w-1/6"}>

                </div>
            </div>
        </Layout>
    )
}

export const query = graphql`
    query ArticlesWithFirst10 {
        miyamo2blog{
            articles(first: 10) {
                edges {
                    cursor
                    node {
                        title
                        thumbnailUrl
                        createdAt
                        updatedAt
                        tags {
                            edges {
                                node {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`

export default IndexPage

export const Head: HeadFC = () => <title>Home Page</title>
