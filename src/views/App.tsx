import { UIProvider } from "@yamada-ui/providers";
import Layout from "../components/Layout";
import ArticleListPage from "./ArticleListPage";
import TaggedArticlesPage from "./TaggedArticlesPage";
import ArticleDetailPage from "./ArticleDetailPage";
import TagsPage from "./TagsPage";
import AboutPage, { type AboutVM } from "./AboutPage";
import NotFoundPage from "./NotFoundPage";
import type {
  ArticleDetailVM,
  ArticleListPageVM,
  TaggedArticlesPageVM,
  TagSummaryVM,
} from "../lib/content";

// keep the same css load order as the Gatsby build (gatsby-browser.tsx)
import "modern-css-reset";
import "prism-themes/themes/prism-dracula.css";
import "../styles/global.css";
import "../styles/vendor.css";

type AppProps =
  | { page: "article-list"; data: ArticleListPageVM }
  | { page: "tagged-articles"; data: TaggedArticlesPageVM }
  | { page: "article-detail"; data: ArticleDetailVM; url: string }
  | { page: "tags"; data: TagSummaryVM[] }
  | { page: "about"; data: AboutVM }
  | { page: "not-found" };

const PageBody = (props: AppProps) => {
  switch (props.page) {
    case "article-list":
      return <ArticleListPage data={props.data} />;
    case "tagged-articles":
      return <TaggedArticlesPage data={props.data} />;
    case "article-detail":
      return <ArticleDetailPage data={props.data} url={props.url} />;
    case "tags":
      return <TagsPage data={props.data} />;
    case "about":
      return <AboutPage data={props.data} />;
    case "not-found":
      return <NotFoundPage />;
  }
};

/**
 * Single React island per page.
 * Mirrors gatsby-shared.tsx's wrapPageElement (UIProvider + Layout).
 */
const App = (props: AppProps) => {
  return (
    <UIProvider>
      <Layout>
        <PageBody {...props} />
      </Layout>
    </UIProvider>
  );
};

export default App;
