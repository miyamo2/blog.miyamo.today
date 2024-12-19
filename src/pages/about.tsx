import { graphql, PageProps, HeadProps } from "gatsby";
import { Grid, GridItem, HStack } from "@yamada-ui/layouts";
import { Button } from "@yamada-ui/button";
import { Heading, Text } from "@yamada-ui/typography";
import { Link } from "@yamada-ui/link";
import * as React from "react";
import { SiGithub, SiZenn, SiQiita, SiSpeakerdeck } from "react-icons/si";
import Layout from "../components/Layout";
import Image from "../components/Image";
import SEO from "../components/SEO";
import "./about.css";

const About = ({ data }: PageProps<Queries.AboutQueryQuery>) => {
  const allFileConnection = data.allFile;

  return (
    <Layout scroll={true}>
      <div className={"hidden lg:block w-full"}>
        <main>
          <Grid templateAreas={`
          ". title ."
          ". image ."
          ". name ."
          ". bio ."
          ". social ."`}
          className={"justify-between"}>
            <GridItem gridArea={"title"}>
              <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
                About
              </Heading>
            </GridItem>
            <GridItem gridArea={"image"} justifySelf={"center"} paddingBottom={"md"}>
              <Image
                allFileConnectrion={allFileConnection}
                alt={"GitHubAvatar:miyamo2"}
                objectFit={"cover"}
                className={"round-image"}
              />
            </GridItem>
            <GridItem gridArea={"name"} paddingBottom={"md"}>
              <Heading as={"h2"} className={"text-2xl font-bold"}>
                {data.github?.user?.login}
              </Heading>
            </GridItem>
            <GridItem gridArea={"bio"} paddingBottom={"md"}>
              <Text>{data.github?.user?.bio}</Text>
            </GridItem>
            <GridItem gridArea={"social"} justifySelf={"center"}>
              <HStack>
                <Button
                  as={Link}
                  href={data.github?.user?.url}
                  isExternal={true}
                  variant="ghost"
                  className={"text-3xl"}
                  size={"lg"}
                  aria-label={"GitHub"}
                >
                  <SiGithub size={"100%"} />
                </Button>
                {data.github?.user?.socialAccounts?.nodes?.map((socialAccount) => {
                  const link = SocialAccountLink(socialAccount?.url ?? "");
                  if (!link) {
                    return <></>;
                  }
                  return link;
                })}
              </HStack>
            </GridItem>
          </Grid>
        </main>
      </div>
      <div className={"lg:hidden w-full"}>
        <main>
          <Grid templateAreas={`
          "title title title title"
          "image image . name"
          "image image . bio"
          "social social social social"`}
                className={"justify-between"}>
            <GridItem gridArea={"title"}>
              <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
                About
              </Heading>
            </GridItem>
            <GridItem gridArea={"image"} justifySelf={"center"} paddingBottom={"md"}>
              <Image
                allFileConnectrion={allFileConnection}
                alt={"GitHubAvatar:miyamo2"}
                objectFit={"cover"}
                className={"round-image"}
              />
            </GridItem>
            <GridItem gridArea={"name"} paddingBottom={"md"}>
              <Heading as={"h2"} className={"text-2xl font-bold"}>
                {data.github?.user?.login}
              </Heading>
            </GridItem>
            <GridItem gridArea={"bio"} paddingBottom={"md"}>
              <Text>{data.github?.user?.bio}</Text>
            </GridItem>
            <GridItem gridArea={"social"} justifySelf={"center"}>
              <HStack>
                <Button
                  as={Link}
                  href={data.github?.user?.url}
                  isExternal={true}
                  variant="ghost"
                  className={"text-3xl"}
                  size={"lg"}
                  aria-label={"GitHub"}
                >
                  <SiGithub size={"100%"} />
                </Button>
                {data.github?.user?.socialAccounts?.nodes?.map((socialAccount) => {
                  const link = SocialAccountLink(socialAccount?.url ?? "");
                  if (!link) {
                    return <></>;
                  }
                  return link;
                })}
              </HStack>
            </GridItem>
          </Grid>
        </main>
      </div>
    </Layout>
  );
};

const SocialAccountLink = (url: string) => {
  const icon = (() => {
    if (url.includes("zenn")) {
      return <SiZenn size={"100%"} />;
    }
    if (url.includes("qiita")) {
      return <SiQiita size={"100%"} />;
    }
    if (url.includes("speakerdeck")) {
      return <SiSpeakerdeck size={"100%"} />;
    }
    return undefined;
  })();
  if (!icon) {
    return <></>;
  }
  return (
    <Button
      as={Link}
      href={url}
      isExternal={true}
      variant="ghost"
      className={"text-3xl"}
      size={"lg"}
      aria-label={`social account link: ${url}`}
    >
      {icon}
    </Button>
  );
};

export const query = graphql`
    query AboutQuery {
        allFile(filter: { id: { eq: "GitHubAvatar:miyamo2" } }) {
            nodes {
                id
                childImageSharp {
                    gatsbyImageData(width: 350, height: 350, placeholder: BLURRED, quality: 100)
                }
            }
        }
        github {
            user(login: "miyamo2") {
                login
                url
                bio
                socialAccounts(first: 10) {
                    nodes {
                        url
                    }
                }
            }
        }
    }
`;

export default About;

export const Head = ({ location }: HeadProps) => {
  const path = location.pathname;
  return <SEO path={path} title={"About"} />;
};
