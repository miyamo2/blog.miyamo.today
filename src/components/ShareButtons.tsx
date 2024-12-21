import {
  FacebookIcon,
  FacebookShareButton,
  HatenaIcon,
  HatenaShareButton,
  XIcon,
  TwitterShareButton,
  EmailIcon,
  EmailShareButton,
  RedditIcon,
  RedditShareButton,
  RedditShareCount,
  LineIcon,
  LineShareButton,
  LinkedinIcon,
  LinkedinShareButton,
} from 'react-share'
import React from 'react'
import { VStack } from "@yamada-ui/layouts";

type StackType = "v" | "h"

export interface ShareButtonProps {
  title: string;
  url: string;
  stackType: StackType;
  buttonSize: number;
}

const ShareButtons = ({title, url, stackType, buttonSize}: ShareButtonProps) => {
  return (
    <>
      {
        stackType === "v" ?
          <VStack>
            <FacebookShareButton url={url}>
              <FacebookIcon size={buttonSize} round />
            </FacebookShareButton>

            <TwitterShareButton title={title} url={url} >
              <XIcon size={buttonSize} round />
            </TwitterShareButton>

            <LinkedinShareButton url={url} >
              <LinkedinIcon size={buttonSize} round />
            </LinkedinShareButton>

            <div>
              <RedditShareButton
                url={url}
                title={title}
                windowWidth={660}
                windowHeight={460}
              >
                <RedditIcon size={buttonSize} round />
              </RedditShareButton>
              <RedditShareCount url={url} />
            </div>

            <HatenaShareButton url={url} >
              <HatenaIcon size={buttonSize} round />
            </HatenaShareButton>

            <LineShareButton url={url}>
              <LineIcon size={buttonSize} round />
            </LineShareButton>

            <EmailShareButton url={url} >
              <EmailIcon size={buttonSize} round />
            </EmailShareButton>
          </VStack>
          :
          <>
            <FacebookShareButton url={url}>
              <FacebookIcon size={buttonSize} round />
            </FacebookShareButton>

            <TwitterShareButton title={title} url={url} >
              <XIcon size={buttonSize} round />
            </TwitterShareButton>

            <LinkedinShareButton url={url} >
              <LinkedinIcon size={buttonSize} round />
            </LinkedinShareButton>
            <div>
              <RedditShareButton
                url={url}
                title={title}
                windowWidth={660}
                windowHeight={460}
              >
                <RedditIcon size={buttonSize} round />
              </RedditShareButton>
              <RedditShareCount url={url} />
            </div>

            <HatenaShareButton url={url} >
              <HatenaIcon size={buttonSize} round />
            </HatenaShareButton>

            <LineShareButton url={url}>
              <LineIcon size={buttonSize} round />
            </LineShareButton>
          </>
      }
    </>
  )
}
export default ShareButtons