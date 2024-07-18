import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  Upload: { input: any; output: any; }
};

export type ArticleConnection = {
  __typename?: 'ArticleConnection';
  edges: Array<ArticleEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ArticleEdge = {
  __typename?: 'ArticleEdge';
  cursor: Scalars['String']['output'];
  node: ArticleNode;
};

export type ArticleNode = Node & {
  __typename?: 'ArticleNode';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  tags: ArticleTagConnection;
  thumbnailUrl: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


export type ArticleNodeTagsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ArticleTagConnection = {
  __typename?: 'ArticleTagConnection';
  edges: Array<ArticleTagEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ArticleTagEdge = {
  __typename?: 'ArticleTagEdge';
  cursor: Scalars['String']['output'];
  node: ArticleTagNode;
};

export type ArticleTagNode = {
  __typename?: 'ArticleTagNode';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  noop?: Maybe<NoopPayload>;
};


export type MutationNoopArgs = {
  input?: InputMaybe<NoopInput>;
};

export type Node = {
  id: Scalars['ID']['output'];
};

export type NoopInput = {
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
};

export type NoopPayload = {
  __typename?: 'NoopPayload';
  clientMutationId?: Maybe<Scalars['String']['output']>;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Scalars['String']['output'];
  hasNextPage?: Maybe<Scalars['Boolean']['output']>;
  hasPreviousPage?: Maybe<Scalars['Boolean']['output']>;
  startCursor: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  article?: Maybe<ArticleNode>;
  articles: ArticleConnection;
  node?: Maybe<Node>;
  tag?: Maybe<TagNode>;
  tags: TagConnection;
};


export type QueryArticleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryArticlesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTagArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTagsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type TagArticleConnection = {
  __typename?: 'TagArticleConnection';
  edges: Array<TagArticleEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type TagArticleEdge = {
  __typename?: 'TagArticleEdge';
  cursor: Scalars['String']['output'];
  node: TagArticleNode;
};

export type TagArticleNode = Node & {
  __typename?: 'TagArticleNode';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  thumbnailUrl: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TagConnection = {
  __typename?: 'TagConnection';
  edges: Array<TagEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type TagEdge = {
  __typename?: 'TagEdge';
  cursor: Scalars['String']['output'];
  node: TagNode;
};

export type TagNode = {
  __typename?: 'TagNode';
  articles: TagArticleConnection;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};


export type TagNodeArticlesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type SourceNodesQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type SourceNodesQuery = { __typename?: 'Query', articles: { __typename?: 'ArticleConnection', edges: Array<{ __typename?: 'ArticleEdge', node: { __typename?: 'ArticleNode', id: string, thumbnailUrl: string, content: string } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage?: boolean | null, endCursor: string } } };


export const SourceNodesDocument = gql`
    query SourceNodes($first: Int, $after: String) {
  articles(first: $first, after: $after) {
    edges {
      node {
        id
        thumbnailUrl
        content
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    SourceNodes(variables?: SourceNodesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SourceNodesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SourceNodesQuery>(SourceNodesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'SourceNodes', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;