import { Box, Flex, Grid, GridItem, Separator } from "@yamada-ui/layouts";
import { Heading } from "@yamada-ui/typography";
import { FontAwesomeIcon } from "@yamada-ui/fontawesome";
import { Tag } from "@yamada-ui/tag";
import { useColorMode } from "@yamada-ui/core";
import Giscus from "@giscus/react";
import { faCalendarDay } from "@fortawesome/free-solid-svg-icons";
import { format } from "@formkit/tempo";
import RemoteImage from "../components/RemoteImage";
import "./article-detail.css";
import { ArticleTOCLarge, ArticleTOCModal } from "../features/ArticleDetail/TOC";
import ShareButtons from "../components/ShareButtons";
import { ReccomendArticles } from "../features/ArticleDetail/Recommend";
import type { ArticleDetailVM } from "../lib/content";

const ArticleDetailPage = ({ data, url }: { data: ArticleDetailVM; url: string }) => {
  const { colorMode } = useColorMode();

  const createdAt = format(new Date(data.createdAt ?? ""), "YYYY/MM/DD");

  return (
    <main>
      <Grid className={"article-detail"}>
        <GridItem gridArea={"title"}>
          <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
            {data.title}
          </Heading>
        </GridItem>
        <GridItem gridArea={"tag"}>
          <Box>
            {data.tags
              .filter((v) => v)
              .map((tag) => (
                <Tag
                  as="a"
                  key={tag.id}
                  size={"md"}
                  id={`${tag.id}-${tag.id}`}
                  href={`/tags/${tag.id}`}
                  bg={["#ddf4ff", "#121d2f"]}
                >
                  #{tag.name}
                </Tag>
              ))}
          </Box>
        </GridItem>
        <GridItem gridArea={"date"}>
          <Box paddingTop={"md"} paddingBottom={"md"}>
            <FontAwesomeIcon icon={faCalendarDay} paddingRight={"sm"} />
            {createdAt}
          </Box>
        </GridItem>
        <GridItem
          as={RemoteImage}
          image={data.imageData}
          gridArea={"image"}
          justifySelf={"center"}
          alt={`ArticleImage:${data.id}`}
          objectFit={"cover"}
        />
        <GridItem gridArea={"lnav"} alignSelf={"end"} h={"full"} className={"hidden lg:block "}>
          <Box h={"full"} w={"full"} overflow={"visible"}>
            <Box position={"sticky"} top={71}>
              <ShareButtons title={data.title ?? ""} url={url} stackType={"v"} buttonSize={32} />
            </Box>
          </Box>
        </GridItem>
        <GridItem
          gridArea={"rnav"}
          alignSelf={"start"}
          h={"full"}
          w={"full"}
          className={"contain-paint hidden lg:block"}
        >
          <Box h={"full"} overflow={"visible"}>
            <Box position={"sticky"} top={71}>
              <ArticleTOCLarge headings={data.headings}></ArticleTOCLarge>
              <ReccomendArticles reccomends={data.recommends} />
            </Box>
          </Box>
        </GridItem>
        <GridItem gridArea={"content"} className={"scroll-offset w-full"}>
          <article>
            <div
              dangerouslySetInnerHTML={{
                __html: data.html ?? "",
              }}
              className={"markdown-body w-full"}
            ></div>
          </article>
        </GridItem>
        <GridItem gridArea={"share"} className={"lg:hidden"} paddingTop={"md"}>
          <Flex justifyContent={"space-evenly"}>
            <ShareButtons title={data.title ?? ""} url={url} stackType={"h"} buttonSize={32} />
          </Flex>
        </GridItem>
        <GridItem gridArea={"comment"} justifySelf={"stretch"}>
          <Separator paddingY={"sm"} />
          <Giscus
            id={"comments"}
            repo={"miyamo2/comments.miyamo.today"}
            repoId={"R_kgDONcgSBA"}
            category={"Announcements"}
            categoryId={"DIC_kwDONcgSBM4ClJ66"}
            mapping={"pathname"}
            term={"Welcome to @giscus/react component!"}
            reactionsEnabled={"1"}
            emitMetadata={"0"}
            inputPosition={"top"}
            theme={colorMode}
            lang={"ja"}
            loading={"lazy"}
            strict={"1"}
          />
        </GridItem>
        <GridItem gridArea={"recommend"} justifySelf={"stretch"} className={"lg:hidden"}>
          <ReccomendArticles reccomends={data.recommends} />
        </GridItem>
      </Grid>
      <ArticleTOCModal headings={data.headings} />
    </main>
  );
};

export default ArticleDetailPage;
