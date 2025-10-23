import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface OrganizationInvitationEmailProps {
  organizationName: string;
  inviterName: string;
  invitationUrl: string;
}

export const OrganizationInvitationEmail = ({
  organizationName,
  inviterName,
  invitationUrl,
}: OrganizationInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>{`You've been invited to join ${organizationName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={section}>
          <Text style={heading}>
            You've been invited to join {organizationName}
          </Text>
          <Text style={text}>
            {inviterName} has invited you to join their organization.
          </Text>
          <Text style={text}>
            Click the button below to accept the invitation and sign in:
          </Text>
          <Button style={button} href={invitationUrl}>
            Accept Invitation & Sign In
          </Button>
          <Text style={footer}>
            This invitation link will expire soon. If you didn't expect this
            invitation, please ignore this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const section = {
  padding: "0 48px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#000000",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#000000",
};

const button = {
  backgroundColor: "#007cba",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "16px 0",
};

const footer = {
  color: "#666666",
  fontSize: "14px",
  marginTop: "24px",
};
