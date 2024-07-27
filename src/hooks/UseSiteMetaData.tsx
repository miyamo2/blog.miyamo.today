import { useStaticQuery, graphql } from "gatsby"

export const useSiteMetaData = () => {
    const { site } = useStaticQuery<Queries.SiteMetaDataQuery>(
        graphql`
            query SiteMetaData {
                site {
                    siteMetadata {
                        title
                        description
                        siteUrl
                        lang
                        image
                        icon
                        twitterUsername
                    }
                }
            }
        `
    )
    return site?.siteMetadata
}