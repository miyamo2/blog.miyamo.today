import { Grid, GridItem, HStack } from "@yamada-ui/layouts";
import { Button } from "@yamada-ui/button";
import { Heading, Text } from "@yamada-ui/typography";
import { Link } from "@yamada-ui/link";
import { SiGithub, SiZenn, SiQiita, SiSpeakerdeck } from "react-icons/si";
import RemoteImage from "../components/RemoteImage";
import type { RemoteImageData } from "../lib/images";
import "./about.css";

export interface AboutVM {
  login: string;
  url: string;
  bio: string;
  socialAccounts: { url: string }[];
  avatarImage: RemoteImageData | null;
}

const AboutPage = ({ data }: { data: AboutVM }) => {
  return (
    <div className={"w-full"}>
      <main>
        <Grid
          templateAreas={`
          "title title title"
          ". image ."
          ". name ."
          ". bio ."
          ". social ."`}
          className={"justify-between"}
        >
          <GridItem gridArea={"title"}>
            <Heading className={"text-3xl font-bold"} paddingBottom={"md"}>
              About
            </Heading>
          </GridItem>
          <GridItem gridArea={"image"} justifySelf={"center"} paddingBottom={"md"}>
            <RemoteImage
              image={data.avatarImage}
              alt={"GitHubAvatar:miyamo2"}
              objectFit={"cover"}
              className={"round-image"}
            />
          </GridItem>
          <GridItem gridArea={"name"} paddingBottom={"md"}>
            <Heading as={"h2"} className={"text-2xl font-bold"}>
              {data.login}
            </Heading>
          </GridItem>
          <GridItem gridArea={"bio"} paddingBottom={"md"}>
            <Text>{data.bio}</Text>
          </GridItem>
          <GridItem gridArea={"social"} justifySelf={"center"}>
            <HStack>
              <Button
                as={Link}
                href={data.url}
                isExternal={true}
                variant="ghost"
                className={"text-3xl"}
                size={"lg"}
                aria-label={"GitHub"}
              >
                <SiGithub size={"100%"} />
              </Button>
              {data.socialAccounts.map((socialAccount) => {
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

export default AboutPage;
