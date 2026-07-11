import ChatList from "./ChatList";
import SessionList from "./SessionList";

const conversations = [
  {
    id: "conv-1",
    name: "Jessica Chen",
    channel: "Website",
    status: "Awaiting reply",
    summary: "Asked about onboarding flow metrics",
    time: "2m ago",
    sentiment: "positive",
    unread: 2,
  },
  {
    id: "conv-2",
    name: "Acme Support",
    channel: "Slack",
    status: "In progress",
    summary: "Billing webhook follow-up",
    time: "8m ago",
    sentiment: "neutral",
    unread: 0,
  },
  {
    id: "conv-3",
    name: "Diego Ramirez",
    channel: "Messenger",
    status: "Resolved",
    summary: "Deployment checklist request",
    time: "15m ago",
    sentiment: "positive",
    unread: 0,
  },
  {
    id: "conv-4",
    name: "Product Marketing",
    channel: "Email",
    status: "Escalated",
    summary: "Assistant tone update for launch",
    time: "22m ago",
    sentiment: "negative",
    unread: 0,
  },
   {
    id: "conv-4",
    name: "Product Marketing",
    channel: "Email",
    status: "Escalated",
    summary: "Assistant tone update for launch",
    time: "22m ago",
    sentiment: "negative",
    unread: 0,
  },
   {
    id: "conv-4",
    name: "Product Marketing",
    channel: "Email",
    status: "Escalated",
    summary: "Assistant tone update for launch",
    time: "22m ago",
    sentiment: "negative",
    unread: 0,
  },
   {
    id: "conv-4",
    name: "Product Marketing",
    channel: "Email",
    status: "Escalated",
    summary: "Assistant tone update for launch",
    time: "22m ago",
    sentiment: "negative",
    unread: 0,
  },
];

const messages = [
  {
    id: "m-1",
    author: "Atlas",
    role: "assistant",
    time: "14:22",
    text: "Hi Jessica! I've pulled the latest onboarding funnel metrics. Conversion rose 6% WoW after the guided tour update.",
  },
  {
    id: "m-2",
    author: "Jessica",
    role: "user",
    time: "14:23",
    text: "Great, can you highlight the biggest drop-off still happening?",
  },
  {
    id: "m-3",
    author: "Atlas",
    role: "assistant",
    time: "14:23",
    text: "The largest drop-off is at the integrations step (42% completion). Users bounce when connecting their data warehouse. Recommending we surface the Loom walkthrough earlier in the flow.",
  },
  {
    id: "m-4",
    author: "Jessica",
    role: "user",
    time: "14:24",
    text: "Share that Loom and prep a summary doc for product, please.",
  },
  {
    id: "m-6",
    author: "Atlas",
    role: "assistant",
    time: "14:25",
    text: "On it. Loom attached, product brief drafted, and reminder scheduled for Tuesday.",
  },
  {
    id: "m-7",
    author: "Atlas",
    role: "assistant",
    time: "14:26",
    text: "On it. Loom attached, product brief drafted, and reminder scheduled for Tuesday.",
  },
  {
    id: "m-8",
    author: "Atlas",
    role: "assistant",
    time: "14:27",
    text: "On it. Loom attached, product brief drafted, and reminder scheduled for Tuesday.",
  },
  {
    id: "m-5",
    author: "Atlas",
    role: "assistant",
    time: "14:24",
    text: "On it. Loom attached, product brief drafted, and reminder scheduled for Tuesday.",
  },
];


export default function ChatWrapper() {
  const selectedConversation = conversations[0];

  return (
    <div className="flex h-full min-h-0 gap-5 overflow-hidden bg-muted/30 pb-2">
      <div className="h-full min-h-0 w-72 shrink-0">
        <SessionList
          conversations={conversations}
          selectedId={selectedConversation.id}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">
        <ChatList selectedConversation={selectedConversation} messages={messages} />
      </div>
    </div>
  );
}
