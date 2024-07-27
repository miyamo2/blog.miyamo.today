import { graphql, PageProps } from "gatsby";
import { useMediaQuery, Heading, Text, HStack, Link, Button } from "@yamada-ui/react";
import * as React from "react";
import { Layout } from "@/components/Layout";
import { Image } from "@/components/Image";
import { SiGithub, SiZenn, SiQiita, SiSpeakerdeck } from "react-icons/si";

const About = ({ data }: PageProps<Queries.AboutQueryQuery>) => {
    const [isLarge] = useMediaQuery([
        "(min-width: 1280px)",
    ])

    const allFileConnection = data.allFile

    return (
        <Layout scroll={true} isLarge={isLarge}>
            <main>
                <Heading className={"text-black text-3xl font-bold"} paddingBottom={"md"}>About</Heading>
                <Image allFileConnectrion={allFileConnection} alt={"GitHubAvatar:miyamo2"} objectFit={"cover"}
                        className={"rounded-full"}/>
                <Heading as={"h3"} className={"text-black text-3xl font-bold"}
                        paddingBottom={"md"}>{data.github?.user?.login}</Heading>
                <Heading as={"h4"} className={"text-black text-xl font-bold"} paddingBottom={"sm"}>Bio</Heading>
                <Text paddingBottom={"md"}>{data.github?.user?.bio}</Text>
                <Heading as={"h4"} className={"text-black text-xl font-bold"} paddingBottom={"sm"}>Social
                    Accounts</Heading>
                <HStack>
                    <Button as={Link} href={data.github?.user?.url} isExternal={true}
                            variant="ghost" className={"text-3xl"}><SiGithub/></Button>
                    {data.github?.user?.socialAccounts?.nodes?.map(
                        (socialAccount) => SocialAccountLink(socialAccount?.url ?? "")
                    )}
                </HStack>
            </main>
        </Layout>
    );
}

const SocialAccountLink = (url: string) => {

    const icon = (() => {
        if (url.includes("zenn")) {
            return <SiZenn/>
        }
        if (url.includes("qiita")) {
            return <SiQiita/>
        }
        if (url.includes("speakerdeck")) {
            return <SiSpeakerdeck/>
        }
        return undefined
    })()
    if (!icon) {
        return <></>
    }
    return <Button as={Link} href={url} isExternal={true} variant="ghost" className={"text-3xl"}>{icon}</Button>
}

export const query = graphql`
    query AboutQuery {
        allFile(filter: {id: {eq: "GitHubAvatar:miyamo2"}}) {
            nodes {
                id
                childImageSharp {
                    gatsbyImageData(width: 350, height: 350, placeholder: BLURRED, quality: 100)
                }
            }
        }
        github{
            user(login:"miyamo2") {
                login
                url
                bio
                socialAccounts(first: 10){
                    nodes{
                        url
                    }
                }
            }
        }
    }
`;

export default About;