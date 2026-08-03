# mock-blogapi

開発用に blogapi.miyamo.today と GitHub GraphQL API をモックするサーバー。
依存関係(`graphql` / `@graphql-tools/mock`)はこのディレクトリ内の `package.json` で
完結しており、サイト本体の依存ツリーには影響しない。
`bun run mock:blogapi` が起動前に自動でインストールする。

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
#      GITHUB_GRAPHQL_API_URL=http://localhost:4000/github/graphql
#      GITHUB_API_TOKEN=mock-token
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
- **GitHub GraphQL API モック** — `POST http://localhost:4000/github/graphql`
  - このサイトが使う範囲(`user { login url bio avatarUrl socialAccounts }`)だけを
    実装した最小スキーマ(`github.ts`)
  - `GITHUB_GRAPHQL_API_URL` を設定すると gatsby-config / gatsby-node が
    実 API の代わりにこちらを参照する(未設定なら実 API)
- **プレースホルダー画像** — `GET http://localhost:4000/images/<name>.png`
  - サムネイル・記事内画像・アバターとして実 PNG を動的生成
    (gatsby-plugin-sharp / gatsby-remark-images-remote の処理が通る)
  - `avatar-` で始まる名前は正方形(460x460)、それ以外は 800x420

## モックデータ

`data.ts` で決定論的に生成している(毎回同じデータ)。

- 記事 30 件(約 5 日間隔、新しい順)・タグ 7 件
- エッジの cursor は実 API と同様にノードの id
  (`gatsby-node.ts` が cursor を `frontmatter.id` のフィルタに使うため)
- 記事 id は ULID 風の文字列(辞書順 = 時系列順)
- 本文はコードブロック・表・リストなどを含む Markdown

件数や内容を変えたい場合は `data.ts` を編集する。

## スキーマ変更への追従

- **blogapi 側**: スキーマは起動時に `.graphql/blogapi.miyamo.today` サブモジュールから
  読み込むため、サブモジュールを更新(`git submodule update --remote` など)して
  再起動すれば型定義・イントロスペクションは自動で追従する。
  さらに [@graphql-tools/mock](https://the-guild.dev/graphql/tools/docs/mocking) により、
  シードデータ(`data.ts`)にないフィールドは型に応じたダミー値を自動で返す
  (`URL` は配信可能なプレースホルダー画像 URL、`DateTime` はパース可能な日時)。
  シードデータにあるフィールドは常に決定論的な値が優先される。
  リアルな値にしたいフィールドだけ `data.ts` / `resolvers.ts` に追加すればよい。
- **GitHub 側**: `github.ts` に手書きした最小スキーマなので、スキーマ定義自体は
  自動追従しない。サイトが新しいフィールドを使い始めたら `github.ts` の SDL に
  追加する(シード値がなくても自動でダミー値が返る)。

## 制限

- 認証は検証しない(`Authorization` ヘッダーは無視される)
- GitHub モックはこのサイトが使うフィールドのみ実装している
