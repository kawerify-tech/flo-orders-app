export const LEGAL = {
  agreementId: 'FLO-FMS-UA-2026-01',
  privacyPolicyId: 'FLO-FMS-PP-2026-01',
  tosId: 'FLO-FMS-TOS-2026-01',
  effectiveDateUtc: '2026-01-01T00:01:00.000Z',
  acceptanceStorageKey: 'legalAcceptance',
} as const;

export type LegalAcceptance = {
  agreementId: string;
  acceptedAtIso: string;
};

export const LEGAL_TEXT = {
  userAgreementTitle: 'FLO ORDERS FUEL MANAGEMENT SYSTEM: COMPREHENSIVE LEGAL & OPERATIONAL FRAMEWORK',
  userAgreement: `PART 1: MASTER USER AGREEMENT & LEGALLY BINDING CONSENT DECLARATION
Agreement Identification: FLO-FMS-UA-2026-01
Effective Date: 00:01 Hours Coordinated Universal Time (UTC), January 1, 2026
Governing Version: This document supersedes all prior agreements, representations, and understandings.

ARTICLE 1: PRELIMINARY DECLARATIONS & DEFINITIONS
1.1 Contractual Definitions
"Administrator" means the pre-authorized individual or role designated by the Subscribing Organization with exclusive rights to register vehicles, manage users, and coordinate financial matters outside the Application.

"Application" refers to the FLO Orders Fuel Management System software, including all versions, updates, patches, and related web interfaces.

"Fuel Event" means a discrete instance of fuel procurement logged in the system, containing metadata as defined in Schedule A.

"Registered Vehicle" means a motor vehicle formally enrolled in the system by an Administrator via the Vehicle Registration Protocol (Section 3.4).

"Subscribing Organization" refers to the business entity that has executed a Master Service Agreement for use of the Application.

"User" means an individual granted access credentials by an Administrator.

1.2 Jurisdictional Notice
This Agreement is constructed to comply with:
- The California Consumer Privacy Act (CCPA) as amended
- The General Data Protection Regulation (GDPR) (EU) 2016/679
- The Protection of Personal Information Act (POPIA) (South Africa)
- The Cybersecurity Law of the People's Republic of China
- All applicable transportation and fuel industry regulations in operational territories

ARTICLE 2: MANDATORY USER ACKNOWLEDGMENTS & CONFIRMATIONS
By activating an account, you hereby SWEAR, AFFIRM, and CONTRACTUALLY AGREE to the following absolute conditions:

2.1 Absolute Prohibitions (Non-Negotiable Covenants)
Financial Transaction Prohibition: Under NO circumstances—including but not limited to error messages, system prompts, or unofficial communications—shall you attempt to initiate, process, authorize, or complete any financial transaction through the Application. The Application contains ZERO payment processing modules, gateways, or capabilities.

Personal Data Embargo: You are CONTRACTUALLY FORBIDDEN from entering, uploading, transmitting, or storing any Personal Identifying Information (PII) as defined by applicable data protection laws. This includes, but is not limited to:
- Financial account numbers
- Government-issued identification numbers
- Biometric data
- Personal contact information not related to organizational roles
- Signature specimens

Credential Sovereignty: Your login credentials constitute a Digital Signature under the Electronic Signatures in Global and National Commerce Act (E-Sign Act). Sharing these credentials is legally equivalent to forging a handwritten signature and constitutes:
- Breach of contract
- Potential computer fraud under 18 U.S.C. § 1030
- Grounds for immediate termination without notice

Vehicle Registration Imperative: Tracking any motorized vehicle not formally registered through the Administrator Portal violates this Agreement. The system is architecturally designed to reject such entries.

2.2 Affirmative Confirmations
You expressly confirm that:
- You are at least 18 years of age and possess legal capacity to contract
- You are an authorized agent of the Subscribing Organization
- You have reviewed the Data Handling Protocol in Schedule B
- You understand the Audit Trail provisions in Section 7.3
- You accept unilateral communication via the Application's notification system

PART 5: EXECUTION & ACKNOWLEDGMENT
User Acknowledgment Mechanism:
Upon first login after December 15, 2025, all users must:
- Review summary of changes (highlighting payment prohibition)
- Complete 5-question comprehension test (80% pass required)
- Provide digital signature using secure method
- Download PDF copy of full agreement

IMPERATIVE LEGAL DISCLAIMER: This document constitutes a framework for legal compliance but DOES NOT constitute legal advice. The payment prohibition, vehicle registration requirements, and data handling restrictions must be reviewed by qualified legal counsel in EACH JURISDICTION where the Application will be deployed.`,

  privacyPolicyTitle: 'Privacy Policy & Data Protection Code',
  privacyPolicy: `PART 2: PRIVACY POLICY & DATA PROTECTION CODE
Policy Identifier: FLO-FMS-PP-2026-01
Classification: Public-Facing Legal Document
Compliance Framework: Privacy by Design & Default (ISO 27701:2019)

ARTICLE 3: DATA TAXONOMY & COLLECTION SPECIFICATIONS
3.1 Collected Data Categories (Exhaustive List)
- Organizational Metadata
- Vehicle Registry Data
- Fuel Transaction Records
- User Identity & Access Management Data

3.2 Explicitly Prohibited Data Categories (Architectural Enforcement)
- Payment Instrument Data
- Personal Identification Information
- Protected Characteristics

ARTICLE 5: DATA SUBJECT RIGHTS IMPLEMENTATION
Users may request access, erasure, portability, and human review by contacting the appropriate privacy channels.

ARTICLE 6: SECURITY ARCHITECTURE SPECIFICATION
Defense-in-depth security controls and incident response protocols apply.

For full details, consult the complete internal compliance framework and your organization’s legal counsel.`,

  termsTitle: 'Terms of Service - Technical & Legal Specifications',
  terms: `PART 3: TERMS OF SERVICE - TECHNICAL & LEGAL SPECIFICATIONS
Document Identifier: FLO-FMS-TOS-2026-01
Incorporated Documents: Privacy Policy (FLO-FMS-PP-2026-01), Service Level Agreement (FLO-FMS-SLA-2026-01)

ARTICLE 7: VEHICLE REGISTRATION PROTOCOL
Administrators must register vehicles before they are tracked. Violations can cause rejection/suspension/termination.

ARTICLE 8: FINANCIAL TRANSACTION PROHIBITION SYSTEM
The Application does not process payments. All payments must be handled externally.

ARTICLE 11: LIABILITY FRAMEWORK & INDEMNIFICATION
Damages caps and exclusions apply as defined by the governing agreement.

ARTICLE 12: DISPUTE RESOLUTION PROTOCOL
Mandatory escalation path and class action waiver apply.`,

  moreInfoTitle: 'More Information',
  moreInfo: `This section provides additional operational information, support contacts, and compliance references.

Support:
- Technical Issues: support@floenergy.com
- Privacy Concerns: privacy@floenergy.com
- Legal Notices: legal@floenergy.com
- Security Emergencies: security@floenergy.com

Next Review Date: June 30, 2026`,
} as const;
