// Central place that defines, for each supported standard object, which
// fields the app displays/edits (min 5, max 10, per the assignment spec).
// "type" drives how the frontend renders the input (text, number, date,
// picklist, textarea). "required" fields are enforced on create.

const OBJECT_CONFIG = {
  Account: {
    label: "Account",
    fields: [
      { name: "Name", label: "Account Name", type: "text", required: true },
      { name: "Industry", label: "Industry", type: "text" },
      { name: "Phone", label: "Phone", type: "text" },
      { name: "Website", label: "Website", type: "text" },
      { name: "BillingCity", label: "Billing City", type: "text" },
      { name: "AnnualRevenue", label: "Annual Revenue", type: "number" },
    ],
  },
  Contact: {
    label: "Contact",
    fields: [
      { name: "FirstName", label: "First Name", type: "text" },
      { name: "LastName", label: "Last Name", type: "text", required: true },
      { name: "Email", label: "Email", type: "text" },
      { name: "Phone", label: "Phone", type: "text" },
      { name: "Title", label: "Title", type: "text" },
      { name: "MailingCity", label: "Mailing City", type: "text" },
    ],
  },
  Lead: {
    label: "Lead",
    fields: [
      { name: "FirstName", label: "First Name", type: "text" },
      { name: "LastName", label: "Last Name", type: "text", required: true },
      { name: "Company", label: "Company", type: "text", required: true },
      { name: "Email", label: "Email", type: "text" },
      { name: "Phone", label: "Phone", type: "text" },
      {
        name: "Status",
        label: "Status",
        type: "picklist",
        options: ["Open - Not Contacted", "Working - Contacted", "Closed - Converted", "Closed - Not Converted"],
      },
    ],
  },
  Opportunity: {
    label: "Opportunity",
    fields: [
      { name: "Name", label: "Opportunity Name", type: "text", required: true },
      {
        name: "StageName",
        label: "Stage",
        type: "picklist",
        required: true,
        options: [
          "Prospecting", "Qualification", "Needs Analysis", "Value Proposition",
          "Id. Decision Makers", "Perception Analysis", "Proposal/Price Quote",
          "Negotiation/Review", "Closed Won", "Closed Lost",
        ],
      },
      { name: "Amount", label: "Amount", type: "number" },
      { name: "CloseDate", label: "Close Date", type: "date", required: true },
      { name: "Probability", label: "Probability (%)", type: "number" },
    ],
  },
  Case: {
    label: "Case",
    fields: [
      { name: "Subject", label: "Subject", type: "text", required: true },
      {
        name: "Status",
        label: "Status",
        type: "picklist",
        options: ["New", "Working", "Escalated", "Closed"],
      },
      {
        name: "Priority",
        label: "Priority",
        type: "picklist",
        options: ["Low", "Medium", "High"],
      },
      {
        name: "Origin",
        label: "Origin",
        type: "picklist",
        options: ["Phone", "Email", "Web"],
      },
      { name: "Description", label: "Description", type: "textarea" },
    ],
  },
};

module.exports = { OBJECT_CONFIG };
