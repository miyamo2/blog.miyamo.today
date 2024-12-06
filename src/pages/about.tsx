import { graphql, PageProps, HeadProps } from "gatsby";
import {
  Heading,
  Text,
  Link,
  Button,
  Grid,
  GridItem,
} from "@yamada-ui/react";
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
      <main>
        <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
          About
        </Heading>
        <Grid
          templateColumns={"repeat(auto-fit, minmax(150px, auto))"}
          justifyContent={"center"}
          gap={"lg"}
        >
          <GridItem>
              <Image
                allFileConnectrion={allFileConnection}
                alt={"GitHubAvatar:miyamo2"}
                objectFit={"cover"}
                className={"round-image"}
              />
          </GridItem>
          <GridItem>
            <Heading as={"h2"} className={"text-3xl font-bold"} paddingBottom={"md"}>
              {data.github?.user?.login}
            </Heading>
            <Text paddingBottom={"md"}>{data.github?.user?.bio}</Text>
            <Grid templateColumns={"repeat(auto-fit, minmax(65px, auto))"} gap={"sm"}>
              <GridItem>
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
              </GridItem>
              {data.github?.user?.socialAccounts?.nodes?.map((socialAccount) => {
                const link = SocialAccountLink(socialAccount?.url ?? "");
                if (!link) {
                  return <></>;
                }
                return <GridItem>{link}</GridItem>;
              })}
            </Grid>
          </GridItem>
        </Grid>
      </main>
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
