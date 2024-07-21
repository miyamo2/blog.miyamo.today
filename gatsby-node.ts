import path from "path";
import { GatsbyNode } from "gatsby";
import { createFileNodeFromBuffer, createRemoteFileNode } from 'gatsby-source-filesystem';
import { request, gql } from "graphql-request";
import { format } from "@formkit/tempo";
import { SourceNodesQuery, SourceNodesDocument, SourceNodesQueryVariables } from './src/generates/graphql';
import InputMaybe = Queries.InputMaybe;

const PER_PAGE = (() => {
    let v = process.env.GATSBY_ARTICLE_PER_PAGE;
    if (!v) {
        return 24;
    }
    const num = parseInt(v);
    if (isNaN(num)) {
        return 24;
    }
    return num;
})();

const range = (start: number, end: number) => [...Array(end - start + 1)].map((_, i) => start + i)

export const sourceNodes: GatsbyNode["sourceNodes"] = async ({ actions, createNodeId, cache, store, createContentDigest }) => {
    const endpoint = process.env.URL;
    if (!endpoint || typeof endpoint !== "string") {
        throw new Error("endpoint must not to be null or undefined");
    }

    let doContinue = true;
    let after: InputMaybe<string> | undefined = undefined;
    while (doContinue) {
        const data: SourceNodesQuery = await request<SourceNodesQuery, SourceNodesQueryVariables>(
            endpoint,
            SourceNodesDocument,
            {
                after: after,
                first: PER_PAGE,
            }
        )
        if (!data) {
            throw new Error("failed to get articles");
        }

        const { createNode, createNodeField } = actions

        data.articles.edges.map(async (edge) => {
            const articleNode = edge.node

            const thumbnailNode = await createRemoteFileNode({
                url: articleNode.thumbnailUrl,
                cache,
                // @ts-ignore
                store,
                createNode: createNode,
                createNodeId: () :string => { return `ArticleImage:${articleNode.id}`},
            });

            createNodeField({
                node: thumbnailNode,
                name: 'ArticleImage',
                value: 'true',
            });

            createNodeField({
                node: thumbnailNode,
                name: 'link',
                value: articleNode.thumbnailUrl,
            });

            const rawContent = articleNode.content.replaceAll(`\\n`, `\n`)
            const content = `---
id: "${articleNode.id}"
title: "${articleNode.title}"
createdAt: "${format(new Date(articleNode.createdAt), "YYYY/MM/DD")}"
updatedAt: "${format(new Date(articleNode.updatedAt), "YYYY/MM/DD")}"
tags: [${articleNode.tags.edges.map((edge) => {
    return `{"id": "${edge.cursor}", "name": "${edge.node.name}"}`
}).join(", ")}]
---
${rawContent}`

            const contentNode = await createFileNodeFromBuffer({
                buffer: Buffer.from(content),
                // @ts-ignore
                store,
                cache,
                createNode,
                createNodeId: () :string => { return `ArticleContent:${articleNode.id}`},
                hash: createContentDigest(content),
                ext: '.md',
            })

            createNodeField({
                node: contentNode,
                name: 'ArticleContent',
                value: 'true',
            });

            createNodeField({
                node: contentNode,
                name: 'link',
                value: content,
            });
            return;
        })

        const { hasNextPage, endCursor } = data.articles.pageInfo
        doContinue = hasNextPage ?? false
        after = endCursor
    }
}

export const createPages: GatsbyNode["createPages"] = async ({actions, graphql}) => {
    const { createPage } = actions;
    await articleListPage(createPage, graphql);
    await articleDetailPage(createPage, graphql);
};

export interface ArticleListPageContext {
    startCursor: string|null;
    perPage: number;
    totalItems: number;
    currentPage: number;
    markdownCursors: string[];
    imageCursors: string[];
}

const articleListPage = async (
    createPage: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["actions"]["createPage"],
    graphql: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["graphql"]
)=> {
    const articlesPageInfoQuery = await graphql<Queries.GetArticlesPageInfoQuery>(
        `
        query GetArticlesPageInfo {
            miyamotoday {
                articles {
                    edges {
                        cursor
                    }
                    totalCount
                }
            }
        }
        `
    )
    if (articlesPageInfoQuery.errors) {
        throw new Error("failed to get articles");
    }

    const articlesPageInfo = articlesPageInfoQuery.data
    if (!articlesPageInfo) {
        throw new Error("faild to get articles count");
    }

    const articlePageInfoEdges = articlesPageInfo.miyamotoday.articles.edges
    const totalArticles = articlesPageInfo.miyamotoday.articles.totalCount

    let cursor: string | null = null;
    range(1, Math.ceil(totalArticles / PER_PAGE)).map((number, index) => {
        const cursors = articlePageInfoEdges
            .slice((number-1)*PER_PAGE, number*PER_PAGE)
            .map((edge) => edge.cursor)

        const imageCursors = articlePageInfoEdges
            .slice((number-1)*PER_PAGE, number*PER_PAGE)
            .map((edge) => `ArticleImage:${edge.cursor}`)

        const ctx: ArticleListPageContext = {
            startCursor: cursor,
            perPage: PER_PAGE,
            totalItems: totalArticles,
            currentPage: number,
            markdownCursors: cursors,
            imageCursors: imageCursors,
        }
        if (index === 0) {
            createPage({
                path: "/",
                component: path.resolve("./src/templates/article-list.tsx"),
                context: ctx,
            });
        }
        createPage({
            path: `/pages/${number}`,
            component: path.resolve("./src/templates/article-list.tsx"),
            context: ctx,
        });
        cursor = articlePageInfoEdges[number*PER_PAGE]?.cursor
    })
}

export interface ArticleDetailPageContext {
    cursor: string;
    imageCursor?: string;
}

const articleDetailPage = async (
    createPage: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["actions"]["createPage"],
    graphql: Parameters<NonNullable<GatsbyNode["createPages"]>>["0"]["graphql"]
) => {
    const getAllArticleCursors = await graphql<Queries.GetAllArticleCursorsQuery>(`
        query GetAllArticleCursors {
            allMarkdownRemark(filter: {frontmatter: {id: {ne: "Noop"}}}) {
                nodes {
                    frontmatter {
                        id
                    }
                }
            }
        }`);

    if (!getAllArticleCursors.data || getAllArticleCursors.errors) {
        throw new Error("failed to get all article cursors");
    }
    const data = getAllArticleCursors.data;
    data.allMarkdownRemark.nodes.forEach((edge) => {
        const id = edge.frontmatter?.id
        if (!id) {
            return;
        }
        const context: ArticleDetailPageContext = {
            cursor: id,
            imageCursor: `ArticleImage:${id}`
        };
        createPage({
            path: `/articles/${id}`,
            component: path.resolve("./src/templates/article-detail.tsx"),
            context,
        });
    });
};