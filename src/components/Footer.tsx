import { Box } from "@yamada-ui/layouts";
import { Text } from "@yamada-ui/typography";

const Footer = () => (
  <footer id={"footer"} className={"shrink-0 flex h-full w-full align-center justify-end flex-col"}>
    <Box className={"text-center"}>
      <Text className={"text-center"} size={"sm"}>
        Copyright © miyamo2 All rights reserved.
      </Text>
    </Box>
  </footer>
);

export default Footer;
