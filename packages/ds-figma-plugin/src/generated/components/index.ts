import Stack from "../primitives/Stack/Stack.figma.json" with { type: "json" };
import Accordion from "./Accordion/Accordion.figma.json" with { type: "json" };
import Alert from "./Alert/Alert.figma.json" with { type: "json" };
import AlertNotice from "./AlertNotice/AlertNotice.figma.json" with { type: "json" };
import Avatar from "./Avatar/Avatar.figma.json" with { type: "json" };
import Badge from "./Badge/Badge.figma.json" with { type: "json" };
import Blockquote from "./Blockquote/Blockquote.figma.json" with { type: "json" };
import Breadcrumbs from "./Breadcrumbs/Breadcrumbs.figma.json" with { type: "json" };
import Button from "./Button/Button.figma.json" with { type: "json" };
import Calendar from "./Calendar/Calendar.figma.json" with { type: "json" };
import Card from "./Card/Card.figma.json" with { type: "json" };
import Carousel from "./Carousel/Carousel.figma.json" with { type: "json" };
import Checkbox from "./Checkbox/Checkbox.figma.json" with { type: "json" };
import Chip from "./Chip/Chip.figma.json" with { type: "json" };
import CodeBlock from "./CodeBlock/CodeBlock.figma.json" with { type: "json" };
import CodeSnippet from "./CodeSnippet/CodeSnippet.figma.json" with { type: "json" };
import Command from "./Command/Command.figma.json" with { type: "json" };
import Details from "./Details/Details.figma.json" with { type: "json" };
import Dialog from "./Dialog/Dialog.figma.json" with { type: "json" };
import Divider from "./Divider/Divider.figma.json" with { type: "json" };
import Field from "./Field/Field.figma.json" with { type: "json" };
import Icon from "./Icon/Icon.figma.json" with { type: "json" };
import Image from "./Image/Image.figma.json" with { type: "json" };
import Input from "./Input/Input.figma.json" with { type: "json" };
import Label from "./Label/Label.figma.json" with { type: "json" };
import Links from "./Links/Links.figma.json" with { type: "json" };
import List from "./List/List.figma.json" with { type: "json" };
import Markdown from "./Markdown/Markdown.figma.json" with { type: "json" };
import NavList from "./NavList/NavList.figma.json" with { type: "json" };
import NavTree from "./NavTree/NavTree.figma.json" with { type: "json" };
import OTP from "./OTP/OTP.figma.json" with { type: "json" };
import PageNavigator from "./PageNavigator/PageNavigator.figma.json" with { type: "json" };
import Pagination from "./Pagination/Pagination.figma.json" with { type: "json" };
import Popover from "./Popover/Popover.figma.json" with { type: "json" };
import Postcard from "./Postcard/Postcard.figma.json" with { type: "json" };
import ProfileFlag from "./ProfileFlag/ProfileFlag.figma.json" with { type: "json" };
import Progress from "./Progress/Progress.figma.json" with { type: "json" };
import RadioGroup from "./RadioGroup/RadioGroup.figma.json" with { type: "json" };
import Select from "./Select/Select.figma.json" with { type: "json" };
import Sheet from "./Sheet/Sheet.figma.json" with { type: "json" };
import ShowMore from "./ShowMore/ShowMore.figma.json" with { type: "json" };
import Shuttle from "./Shuttle/Shuttle.figma.json" with { type: "json" };
import Skeleton from "./Skeleton/Skeleton.figma.json" with { type: "json" };
import Spinner from "./Spinner/Spinner.figma.json" with { type: "json" };
import Stat from "./Stat/Stat.figma.json" with { type: "json" };
import Status from "./Status/Status.figma.json" with { type: "json" };
import Switch from "./Switch/Switch.figma.json" with { type: "json" };
import Table from "./Table/Table.figma.json" with { type: "json" };
import Tabs from "./Tabs/Tabs.figma.json" with { type: "json" };
import Text from "./Text/Text.figma.json" with { type: "json" };
import TextField from "./TextField/TextField.figma.json" with { type: "json" };
import Toast from "./Toast/Toast.figma.json" with { type: "json" };
import ToggleSwitch from "./ToggleSwitch/ToggleSwitch.figma.json" with { type: "json" };
import Tooltip from "./Tooltip/Tooltip.figma.json" with { type: "json" };
import Truncate from "./Truncate/Truncate.figma.json" with { type: "json" };
import Walkthrough from "./Walkthrough/Walkthrough.figma.json" with { type: "json" };

export const figmaComponentRegistry = {
  "Accordion": Accordion,
  "Alert": Alert,
  "AlertNotice": AlertNotice,
  "Avatar": Avatar,
  "Badge": Badge,
  "Blockquote": Blockquote,
  "Breadcrumbs": Breadcrumbs,
  "Button": Button,
  "Calendar": Calendar,
  "Card": Card,
  "Carousel": Carousel,
  "Checkbox": Checkbox,
  "Chip": Chip,
  "CodeBlock": CodeBlock,
  "CodeSnippet": CodeSnippet,
  "Command": Command,
  "Details": Details,
  "Dialog": Dialog,
  "Divider": Divider,
  "Field": Field,
  "Icon": Icon,
  "Image": Image,
  "Input": Input,
  "Label": Label,
  "Links": Links,
  "List": List,
  "Markdown": Markdown,
  "NavList": NavList,
  "NavTree": NavTree,
  "OTP": OTP,
  "PageNavigator": PageNavigator,
  "Pagination": Pagination,
  "Popover": Popover,
  "Postcard": Postcard,
  "ProfileFlag": ProfileFlag,
  "Progress": Progress,
  "RadioGroup": RadioGroup,
  "Select": Select,
  "Sheet": Sheet,
  "ShowMore": ShowMore,
  "Shuttle": Shuttle,
  "Skeleton": Skeleton,
  "Spinner": Spinner,
  "Stat": Stat,
  "Status": Status,
  "Switch": Switch,
  "Table": Table,
  "Tabs": Tabs,
  "Text": Text,
  "TextField": TextField,
  "Toast": Toast,
  "ToggleSwitch": ToggleSwitch,
  "Tooltip": Tooltip,
  "Truncate": Truncate,
  "Walkthrough": Walkthrough,
} as const;

export type FigmaComponentName = keyof typeof figmaComponentRegistry;

export const figmaPrimitiveRegistry = {
  "Stack": Stack,
} as const;

export type FigmaPrimitiveName = keyof typeof figmaPrimitiveRegistry;
