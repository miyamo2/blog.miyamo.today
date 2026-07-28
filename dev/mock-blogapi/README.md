# mock-blogapi

開発用に blogapi.miyamo.today をモックする GraphQL サーバー。
追加の依存関係なし(既存の `graphql` パッケージと Bun のみ)で動作する。

## 使い方

```sh
# 1. スキーマのサブモジュールを取得(初回のみ)
git submodule update --init

# 2. モックサーバーを起動
bun run mock:blogapi

# 3. 別ターミナルで gatsby develop
#    .env.development に以下を設定しておく(.env.development.example 参照)
#      BLOG_API_MIYAMO_TODAY_URL=http://localhost:4000/graphql
#      BLOG_API_MIYAMO_TODAY_TOKEN=mock-token
bun run develop
```

ポートを変えたい場合は `MOCK_BLOGAPI_PORT` を設定する。

```sh
MOCK_BLOGAPI_PORT=5001 bun run mock:blogapi
```

## 提供するもの

- **GraphQL エンドポイント** — `POST http://localhost:4000/graphql`
  - スキーマは `.graphql/blogapi.miyamo.today`(schema.miyamo.today サブモジュール)の
    `.graphqls` をそのまま読み込むため、実 API と乖離しない
  - `articles` / `article` / `tags` / `tag` / `node` クエリと
    first/last/after/before によるページングに対応
  - イントロスペクションに対応(gatsby-source-graphql のスキーマ取得が通る)
  - ブラウザから `GET /graphql?query={...}` でも確認可能
- **プレースホルダー画像** — `GET http://localhost:4000/images/<name>.png`
  - サムネイル・記事内画像として実 PNG を動的生成
    (gatsby-plugin-sharp / gatsby-remark-images-remote の処理が通る)

## モックデータ

`data.ts` で決定論的に生成している(毎回同じデータ)。

- 記事 30 件(約 5 日間隔、新しい順)・タグ 7 件
- エッジの cursor は実 API と同様にノードの id
  (`gatsby-node.ts` が cursor を `frontmatter.id` のフィルタに使うため)
- 記事 id は ULID 風の文字列(辞書順 = 時系列順)
- 本文はコードブロック・表・リストなどを含む Markdown

件数や内容を変えたい場合は `data.ts` を編集する。

## 制限

- 認証は検証しない(`Authorization` ヘッダーは無視される)
- GitHub GraphQL API(アバター取得)はモック対象外なので、
  `GITHUB_API_TOKEN` には引き続き実トークンが必要
