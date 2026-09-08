/**
 * Transportation Guidelines & Code of Conduct
 * Displayed in registration flow and parent dashboard
 */

export const transportationGuidelines = {
  title: "School Bus Operations Policy & Passenger Conduct",
  pdfLink: "/beka-transport-guidelines.pdf",
  keyPoints: [
    {
      title: "Punctuality",
      content:
        "Parents and students must be present at their assigned pick-up point 5 minutes before scheduled departure.",
    },
    {
      title: "Safety & Conduct",
      content:
        "Students must follow bus wardens' instructions, remain seated with seatbelts fastened, and uphold school values.",
    },
    {
      title: "Seat Allocation & Fees",
      content:
        "Bus service is allocated on a term-by-term basis. Service commences only after payment verification by the Accounts office.",
    },
    {
      title: "Drop-off Security",
      content:
        "Nursery and primary students will only be handed over to registered parents or authorized guardians.",
    },
  ],
  agreementText:
    "I have read, understood, and agree to the BEKA Academy Transportation & Bus Procedures and Guidelines and consent to abide by all transit safety policies.",
};

export type TransportationGuidelines = typeof transportationGuidelines;
