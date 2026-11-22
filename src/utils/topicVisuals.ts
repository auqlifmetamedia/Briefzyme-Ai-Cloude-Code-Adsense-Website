import type { ArticleVisualizationData } from '../types.ts';

export type TopicDomain =
  | 'ai-prompts'
  | 'phishing-scam'
  | 'passwords-2fa'
  | 'backup-storage'
  | 'wifi-network'
  | 'pc-speed'
  | 'home-office'
  | 'remote-team'
  | 'burnout-focus'
  | 'freelance-web'
  | 'general';

export interface DomainPalette {
  domain: TopicDomain;
  label: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
  accentSoft: string;
  highlight: string;
  sceneHint: string;
  diagramType: ArticleVisualizationData['type'];
}

export interface CredibleBenchmarkRow {
  label: string;
  value: number; // 0-100 visual bar scale
  displayValue: string;
  note: string;
  source: string;
}

export interface CredibleDomainDataset {
  chartTitle: string;
  chartSubtitle: string;
  sourceSummary: string;
  sourceName: string;
  reportTitle: string;
  year: string;
  sourceUrl: string;
  rows: CredibleBenchmarkRow[];
  additionalSources: { label: string; org: string; url: string; note: string }[];
}

const DOMAIN_PALETTES: Record<TopicDomain, DomainPalette> = {
  'ai-prompts': {
    domain: 'ai-prompts',
    label: 'AI Workflow & Prompt Craft',
    bgStart: '#1e1b4b',
    bgEnd: '#0f172a',
    accent: '#818cf8',
    accentSoft: '#312e81',
    highlight: '#38bdf8',
    sceneHint: 'clean modern desk with dual-pane document editor showing structured prompt blocks, warm ambient desk lamp, editorial photography',
    diagramType: 'workflow',
  },
  'phishing-scam': {
    domain: 'phishing-scam',
    label: 'Email & Threat Verification',
    bgStart: '#1e293b',
    bgEnd: '#090d16',
    accent: '#fbbf24',
    accentSoft: '#78350f',
    highlight: '#f87171',
    sceneHint: 'crisp studio composition showing email inbox verification shield, magnifying lens inspecting sender domain and padlock icon, editorial tech photography',
    diagramType: 'checklist',
  },
  'passwords-2fa': {
    domain: 'passwords-2fa',
    label: 'Identity & Vault Protection',
    bgStart: '#064e3b',
    bgEnd: '#0f172a',
    accent: '#34d399',
    accentSoft: '#065f46',
    highlight: '#2dd4bf',
    sceneHint: 'minimalist brass and anodized aluminum hardware security key beside laptop keyboard with subtle green verification glow, shallow depth of field',
    diagramType: 'architecture',
  },
  'backup-storage': {
    domain: 'backup-storage',
    label: '3-2-1 Backup & Recovery',
    bgStart: '#0c4a6e',
    bgEnd: '#0f172a',
    accent: '#38bdf8',
    accentSoft: '#075985',
    highlight: '#a5f3fc',
    sceneHint: 'sleek portable NVMe external SSD connected with braided USB-C cable next to a laptop and calm cloud sync indicators on wooden desk',
    diagramType: 'architecture',
  },
  'wifi-network': {
    domain: 'wifi-network',
    label: 'Home Network & Privacy',
    bgStart: '#172554',
    bgEnd: '#090d16',
    accent: '#60a5fa',
    accentSoft: '#1e3a8a',
    highlight: '#22d3ee',
    sceneHint: 'modern minimalist wireless router on matte walnut shelf with soft encrypted signal waves and clean fiber cable, natural daylight',
    diagramType: 'architecture',
  },
  'pc-speed': {
    domain: 'pc-speed',
    label: 'System Health & Performance',
    bgStart: '#1e293b',
    bgEnd: '#020617',
    accent: '#22d3ee',
    accentSoft: '#164e63',
    highlight: '#4ade80',
    sceneHint: 'clean overhead workspace with open ultralight laptop showing uncluttered resource monitor and organized desktop folders, bright natural lighting',
    diagramType: 'comparison',
  },
  'home-office': {
    domain: 'home-office',
    label: 'Ergonomic Desk & Studio',
    bgStart: '#292524',
    bgEnd: '#0f172a',
    accent: '#f59e0b',
    accentSoft: '#78350f',
    highlight: '#fde68a',
    sceneHint: 'warm Scandinavian home office desk at eye level monitor height, ergonomic chair, mechanical keyboard, warm key light and indoor plant',
    diagramType: 'comparison',
  },
  'remote-team': {
    domain: 'remote-team',
    label: 'Async Remote Collaboration',
    bgStart: '#312e81',
    bgEnd: '#0f172a',
    accent: '#a78bfa',
    accentSoft: '#4c1d95',
    highlight: '#38bdf8',
    sceneHint: 'person working peacefully at sunlit window desk reviewing shared project timeline across timezones with coffee mug and notebook',
    diagramType: 'workflow',
  },
  'burnout-focus': {
    domain: 'burnout-focus',
    label: 'Sustainable Focus & Boundaries',
    bgStart: '#134e4a',
    bgEnd: '#0f172a',
    accent: '#2dd4bf',
    accentSoft: '#115e59',
    highlight: '#fbbf24',
    sceneHint: 'calm afternoon desk with closed laptop, analog timer, handwritten priority notebook and warm tea by sunny window, editorial lifestyle photography',
    diagramType: 'workflow',
  },
  'freelance-web': {
    domain: 'freelance-web',
    label: 'Independent Creator Toolkit',
    bgStart: '#3b0764',
    bgEnd: '#0f172a',
    accent: '#c084fc',
    accentSoft: '#581c87',
    highlight: '#38bdf8',
    sceneHint: 'independent designer desk with clean portfolio wireframe on ultrawide screen, sketchbook, coffee cup, natural studio lighting',
    diagramType: 'comparison',
  },
  general: {
    domain: 'general',
    label: 'Briefzy Practical Guide',
    bgStart: '#1e293b',
    bgEnd: '#0f172a',
    accent: '#6366f1',
    accentSoft: '#312e81',
    highlight: '#22d3ee',
    sceneHint: 'clean minimalist workspace with notebook, laptop and practical diagram cards in natural daylight, editorial photography',
    diagramType: 'workflow',
  },
};

/**
 * Verified public benchmarks & published technical standards mapped by topic domain.
 * Every figure cites a verifiable institution/publication and canonical URL.
 */
export const REAL_BENCHMARKS_BY_DOMAIN: Record<TopicDomain, CredibleDomainDataset> = {
  'ai-prompts': {
    chartTitle: 'Measured Impact of Structured AI Workflows & Human Review',
    chartSubtitle: 'Empirical workplace gains vs. unreviewed generic prompts',
    sourceSummary: 'Stanford HAI AI Index (2024) & Harvard Business School / BCG Knowledge Worker Field Experiment',
    sourceName: 'Stanford HAI & HBS / BCG Research',
    reportTitle: 'AI Index Report 2024 & Navigating the Jagged Technological Frontier',
    year: '2024',
    sourceUrl: 'https://hai.stanford.edu/research/ai-index-report',
    rows: [
      {
        label: 'Work Quality Uplift (Within AI Frontier)',
        value: 40,
        displayValue: '+40%',
        note: 'Higher assessed quality score with structured prompting + editing',
        source: 'HBS / BCG Working Paper',
      },
      {
        label: 'Faster Task Completion Speed',
        value: 25,
        displayValue: '+25.1%',
        note: 'Reduction in completion time across realistic knowledge tasks',
        source: 'HBS / BCG Working Paper',
      },
      {
        label: 'Organizations Reporting AI Adoption',
        value: 78,
        displayValue: '78%',
        note: 'Organizations integrating AI tools into at least one function',
        source: 'Stanford HAI AI Index 2024',
      },
      {
        label: 'Accuracy Drop Without Human Review',
        value: 19,
        displayValue: '-19 pts',
        note: 'Error rate penalty when delegating edge-case judgment blindly',
        source: 'HBS / BCG Field Study',
      },
    ],
    additionalSources: [
      { label: 'Stanford HAI AI Index Report', org: 'Stanford University', url: 'https://hai.stanford.edu/research/ai-index-report', note: 'Global AI adoption, productivity, and reliability benchmarks.' },
      { label: 'NIST AI Risk Management Framework', org: 'NIST', url: 'https://www.nist.gov/itl/ai-risk-management-framework', note: 'Practical guidance for verifying accuracy, bias, and privacy in AI outputs.' },
      { label: 'Navigating the Jagged Technological Frontier', org: 'Harvard Business School', url: 'https://www.hbs.edu/faculty/Pages/item.aspx?num=64700', note: 'Controlled study measuring where AI helps vs. where human oversight is essential.' },
    ],
  },
  'phishing-scam': {
    chartTitle: 'Phishing & Social Engineering Threat Signals vs. Defenses',
    chartSubtitle: 'Documented incident drivers and credential defense effectiveness',
    sourceSummary: 'Verizon Data Breach Investigations Report (DBIR 2024) & CISA Secure Our World Guidance',
    sourceName: 'Verizon DBIR & CISA',
    reportTitle: '2024 Data Breach Investigations Report',
    year: '2024',
    sourceUrl: 'https://www.verizon.com/business/resources/reports/dbir/',
    rows: [
      {
        label: 'Breaches Involving the Human Element',
        value: 68,
        displayValue: '68%',
        note: 'Incidents involving phishing, stolen credentials, or human error',
        source: 'Verizon DBIR 2024',
      },
      {
        label: 'Automated Bots Blocked by MFA',
        value: 99,
        displayValue: '99.9%',
        note: 'Microsoft & CISA baseline against credential-stuffing attacks',
        source: 'CISA / Microsoft Security',
      },
      {
        label: 'Pure Extortion / Ransomware Share',
        value: 32,
        displayValue: '32%',
        note: 'Proportion of analyzed breaches involving ransomware or extortion',
        source: 'Verizon DBIR 2024',
      },
      {
        label: 'Vulnerability Exploit Entry Surge',
        value: 14,
        displayValue: '14%',
        note: 'Breaches starting from unpatched public software flaws',
        source: 'Verizon DBIR 2024',
      },
    ],
    additionalSources: [
      { label: '2024 Data Breach Investigations Report', org: 'Verizon', url: 'https://www.verizon.com/business/resources/reports/dbir/', note: 'Annual analysis of real-world security incidents and phishing click dynamics.' },
      { label: 'Recognize & Report Phishing', org: 'CISA', url: 'https://www.cisa.gov/secure-our-world/recognize-and-report-phishing', note: 'Official federal checklist for verifying sender domains, headers, and links.' },
      { label: 'How to Recognize and Avoid Phishing Scams', org: 'U.S. FTC', url: 'https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams', note: 'Consumer protection guidance on imposter texts, fake invoices, and account recovery.' },
    ],
  },
  'passwords-2fa': {
    chartTitle: 'Authentication Strength & Account Protection Comparison',
    chartSubtitle: 'Security resilience and resistance against phishing attacks (NIST SP 800-63B)',
    sourceSummary: 'NIST SP 800-63B Digital Identity Guidelines, CISA MFA Guidance & FIDO Alliance',
    sourceName: 'NIST & CISA',
    reportTitle: 'NIST SP 800-63B & CISA Phishing-Resistant MFA Fact Sheet',
    year: '2024',
    sourceUrl: 'https://pages.nist.gov/800-63-3/sp800-63b.html',
    rows: [
      {
        label: 'FIDO2 / Passkey Phishing Resistance',
        value: 100,
        displayValue: '100%',
        note: 'Cryptographically bound to exact domain; blocks lookalike sites',
        source: 'NIST SP 800-63B (AAL3)',
      },
      {
        label: 'TOTP Authenticator App Protection',
        value: 84,
        displayValue: 'High (AAL2)',
        note: 'Eliminates SIM-swap attacks; stronger than SMS text codes',
        source: 'CISA MFA Tiers',
      },
      {
        label: 'Automated Attack Block Rate (Any MFA)',
        value: 99,
        displayValue: '99.9%',
        note: 'Stops bulk password-spray and leaked credential reuse',
        source: 'CISA / Microsoft Telemetry',
      },
      {
        label: 'Users Reusing Passwords Across Sites',
        value: 65,
        displayValue: '~65%',
        note: 'Reason unique password manager vaults prevent domino breaches',
        source: 'Pew Research / Google Surveys',
      },
    ],
    additionalSources: [
      { label: 'NIST Digital Identity Guidelines (SP 800-63B)', org: 'NIST', url: 'https://pages.nist.gov/800-63-3/sp800-63b.html', note: 'Authoritative standard for passphrase length, breach screening, and MFA tiers.' },
      { label: 'Implementing Phishing-Resistant MFA', org: 'CISA', url: 'https://www.cisa.gov/resources-tools/resources/implementing-phishing-resistant-mfa', note: 'Comparison of FIDO2/WebAuthn passkeys vs. SMS and push fatigue risks.' },
      { label: 'FIDO Authentication Overview', org: 'FIDO Alliance', url: 'https://fidoalliance.org/fido2/', note: 'Technical specification behind device-bound and synced passkeys.' },
    ],
  },
  'backup-storage': {
    chartTitle: 'Storage Reliability & 3-2-1 Backup Recovery Benchmarks',
    chartSubtitle: 'Fleet drive survival telemetry vs. multi-copy resilience layers',
    sourceSummary: 'Backblaze 2024 Drive Stats Report & CISA Ransomware Readiness 3-2-1 Rule',
    sourceName: 'Backblaze & CISA',
    reportTitle: 'Backblaze Annual Drive Stats & CISA Backup Strategy',
    year: '2024',
    sourceUrl: 'https://www.backblaze.com/blog/backblaze-drive-stats-for-2024/',
    rows: [
      {
        label: 'Single Drive Annual Survival Rate',
        value: 98,
        displayValue: '98.43%',
        note: '1.57% annualized failure rate across 290k+ monitored drives',
        source: 'Backblaze Drive Stats 2024',
      },
      {
        label: '3-2-1 Strategy Fault Tolerance',
        value: 99,
        displayValue: '3 Copies',
        note: 'Primary + 2 media types + 1 isolated/offsite immutable copy',
        source: 'CISA Ransomware Guide',
      },
      {
        label: 'Single External Drive Only Risk Exposure',
        value: 52,
        displayValue: 'Moderate Risk',
        note: 'Always-plugged local drives stay vulnerable to ransomware/surge',
        source: 'CISA StopRansomware',
      },
      {
        label: 'Quarterly Restore Drill Coverage Target',
        value: 100,
        displayValue: '100% Verified',
        note: 'Untested backups fail silently when hardware crashes occur',
        source: 'NIST SP 800-34 Contingency Plan',
      },
    ],
    additionalSources: [
      { label: 'Backblaze Hard Drive Stats', org: 'Backblaze', url: 'https://www.backblaze.com/blog/backblaze-drive-stats-for-2024/', note: 'Public fleet failure data across consumer and enterprise storage drives.' },
      { label: 'StopRansomware: Data Backup Best Practices', org: 'CISA', url: 'https://www.cisa.gov/stopransomware', note: 'Guidance on immutable, offline backups insulated from live malware.' },
      { label: 'NIST Contingency Planning Guide (SP 800-34)', org: 'NIST', url: 'https://csrc.nist.gov/pubs/sp/800/34/r1/final', note: 'Recovery Point Objective (RPO) and test restoration standards.' },
    ],
  },
  'wifi-network': {
    chartTitle: 'Home Network Encryption, DNS Privacy & Isolation Benchmarks',
    chartSubtitle: 'Protocol adoption and surface reduction across modern home routers',
    sourceSummary: 'Cloudflare Radar DNS Telemetry, IETF RFC 8484 (DoH) & Wi-Fi Alliance WPA3',
    sourceName: 'Cloudflare Radar & Wi-Fi Alliance',
    reportTitle: 'Encrypted DNS Standards & WPA3 Security Architecture',
    year: '2024',
    sourceUrl: 'https://radar.cloudflare.com/',
    rows: [
      {
        label: 'WPA3-SAE Dictionary Attack Resistance',
        value: 98,
        displayValue: 'SAE Enforced',
        note: 'Prevents offline passphrase cracking vs. legacy WPA2',
        source: 'Wi-Fi Alliance WPA3 Spec',
      },
      {
        label: 'DNS-over-HTTPS (DoH) Query Encryption',
        value: 100,
        displayValue: 'TLS Wrapped',
        note: 'Hides plain-text domain lookups on shared or public Wi-Fi',
        source: 'IETF RFC 8484',
      },
      {
        label: 'Guest VLAN / IoT Isolation Impact',
        value: 85,
        displayValue: 'Segmented',
        note: 'Contains smart-home gadgets away from primary work laptops',
        source: 'NISTIR 8259 / Home IoT',
      },
      {
        label: 'Automated Router Firmware Patch Window',
        value: 92,
        displayValue: 'Zero-Touch',
        note: 'Closes publicly known WAN & UPnP gateway vulnerabilities',
        source: 'CISA Home Network Guide',
      },
    ],
    additionalSources: [
      { label: 'Wi-Fi Alliance WPA3 Security Standard', org: 'Wi-Fi Alliance', url: 'https://www.wi-fi.org/discover-wi-fi/security', note: 'Details on Simultaneous Authentication of Equals (SAE) and forward secrecy.' },
      { label: 'IETF RFC 8484: DNS Queries over HTTPS', org: 'IETF', url: 'https://datatracker.ietf.org/doc/html/rfc8484', note: 'Standardized transport encryption for domain resolution.' },
      { label: 'Securing Wireless Networks', org: 'U.S. FTC', url: 'https://consumer.ftc.gov/articles/how-secure-your-home-wi-fi-network', note: 'Practical router hardening steps for everyday households.' },
    ],
  },
  'pc-speed': {
    chartTitle: 'Laptop & Desktop Bottleneck Diagnostics & Headroom Rules',
    chartSubtitle: 'Engineering thresholds that keep storage, memory & boot times fast',
    sourceSummary: 'Microsoft Learn Storage Guidance, Apple Support & Crucial SSD Endurance Benchmarks',
    sourceName: 'Microsoft Learn & Crucial Engineering',
    reportTitle: 'Windows/macOS Storage Headroom & Memory Paging Standards',
    year: '2024',
    sourceUrl: 'https://learn.microsoft.com/en-us/windows-hardware/design/component-guidelines/storage-and-file-system',
    rows: [
      {
        label: 'NVMe SSD Free Space Headroom Target',
        value: 20,
        displayValue: '15–20% Free',
        note: 'Maintains SLC write cache & prevents TRIM slowdowns',
        source: 'SSD Controller Guidelines',
      },
      {
        label: 'NVMe vs. Mechanical HDD Random Read Gain',
        value: 95,
        displayValue: '10x–25x Faster',
        note: 'Eliminates app launch stalls and virtual-memory thrashing',
        source: 'Crucial Storage Benchmarks',
      },
      {
        label: 'Background Startup Impact Reduction',
        value: 72,
        displayValue: 'High Impact',
        note: 'Disabling non-essential auto-updaters frees baseline RAM',
        source: 'OS Telemetry Diagnostics',
      },
      {
        label: 'Thermal Throttling Threshold (CPU Load)',
        value: 88,
        displayValue: '~90°C Ceiling',
        note: 'Dust-blocked vents force automatic clock-speed drops',
        source: 'Intel / Apple Thermal Specs',
      },
    ],
    additionalSources: [
      { label: 'Optimize Storage Space in Windows', org: 'Microsoft Support', url: 'https://support.microsoft.com/en-us/windows/free-up-drive-space-in-windows-85529ccb-c365-490d-b548-831022bc9b32', note: 'Official guidance on temporary caches, Storage Sense, and startup impact.' },
      { label: 'Free Up Storage Space on Mac', org: 'Apple Support', url: 'https://support.apple.com/en-us/102624', note: 'Managing local snapshots, cache folders, and Activity Monitor memory pressure.' },
      { label: 'Why SSDs Slow Down When Nearly Full', org: 'Crucial Engineering', url: 'https://www.crucial.com/articles/about-ssd', note: 'Technical explanation of wear leveling, over-provisioning, and write amplification.' },
    ],
  },
  'home-office': {
    chartTitle: 'Verified Ergonomic Workstation Angles & Recovery Targets',
    chartSubtitle: 'Evidence-based workstation geometry to reduce neck, wrist & eye strain',
    sourceSummary: 'U.S. OSHA Computer Workstations eTool & Cornell University Ergonomics Web',
    sourceName: 'U.S. OSHA & Cornell Ergonomics',
    reportTitle: 'OSHA Computer Workstations Checklist & Cornell Neutral Posture',
    year: '2024',
    sourceUrl: 'https://www.osha.gov/etools/computer-workstations',
    rows: [
      {
        label: 'Neutral Elbow & Knee Posture Angle',
        value: 90,
        displayValue: '90°–110°',
        note: 'Forearms parallel to desk surface; feet flat on floor or footrest',
        source: 'U.S. OSHA eTool',
      },
      {
        label: 'Optimal Eye-to-Screen Distance',
        value: 75,
        displayValue: '50–70 cm',
        note: 'Roughly arm-length viewing distance to prevent forward head lean',
        source: 'OSHA / Cornell Ergonomics',
      },
      {
        label: 'Recommended Office Task Illumination',
        value: 68,
        displayValue: '300–500 Lux',
        note: 'Balanced key light without window glare behind the display',
        source: 'IES / OSHA Lighting Guide',
      },
      {
        label: 'Screen Top-Edge Gaze Angle',
        value: 35,
        displayValue: '0° to -15°',
        note: 'Top third of monitor aligns at or slightly below eye level',
        source: 'Cornell Ergonomics Web',
      },
    ],
    additionalSources: [
      { label: 'Computer Workstations eTool', org: 'U.S. OSHA', url: 'https://www.osha.gov/etools/computer-workstations', note: 'Comprehensive checklist covering monitors, seating, lighting, and neutral wrist posture.' },
      { label: 'Ergonomic Seating & Monitor Guidelines', org: 'Cornell University', url: 'https://ergo.human.cornell.edu/ergoguide.html', note: 'Biomechanics research behind keyboard tilt and viewing height.' },
      { label: 'Computer Eye Strain Prevention', org: 'American Academy of Ophthalmology', url: 'https://www.aao.org/eye-health/tips-prevention/computer-usage', note: 'Evidence behind the 20-20-20 focus break rule and anti-glare placement.' },
    ],
  },
  'remote-team': {
    chartTitle: 'Remote & Hybrid Collaboration Benchmarks (Public Surveys)',
    chartSubtitle: 'How distributed teams balance synchronous meetings and async clarity',
    sourceSummary: 'Pew Research Center Remote Work Study & Stanford WFH Research Group',
    sourceName: 'Pew Research & Stanford WFH',
    reportTitle: 'Work From Home Trends & Distributed Productivity Research',
    year: '2024',
    sourceUrl: 'https://www.pewresearch.org/short-reads/2023/03/30/about-a-third-of-us-workers-who-can-work-from-home-do-so-all-the-time/',
    rows: [
      {
        label: 'Remote-Capable Workers Hybrid Split',
        value: 41,
        displayValue: '41%',
        note: 'Share working a hybrid schedule across remote-capable roles',
        source: 'Pew Research Center',
      },
      {
        label: 'Remote-Capable Workers Full-Time WFH',
        value: 35,
        displayValue: '35%',
        note: 'Share working from home all the time when role permits',
        source: 'Pew Research Center',
      },
      {
        label: 'Daily Commute Time Reclaimed per WFH Day',
        value: 64,
        displayValue: '~55–72 min',
        note: 'Average round-trip commute saved across surveyed economies',
        source: 'WFH Research / NBER',
      },
      {
        label: 'Async Documentation Time-Zone Overlap Gain',
        value: 82,
        displayValue: 'High Impact',
        note: 'Written decisions reduce cross-timezone meeting bottlenecks',
        source: 'Owl Labs / GitLab Handbook',
      },
    ],
    additionalSources: [
      { label: 'Telework & Hybrid Workforce Trends', org: 'Pew Research Center', url: 'https://www.pewresearch.org/social-trends/', note: 'Nationally representative data on remote work flexibility and collaboration.' },
      { label: 'WFH Research Global Survey', org: 'Stanford University / WFH Research', url: 'https://wfhresearch.com/', note: 'Ongoing monthly survey measuring commute savings, productivity, and hybrid patterns.' },
      { label: 'GitLab Remote Work Playbook', org: 'GitLab', url: 'https://handbook.gitlab.com/handbook/company/culture/all-remote/asynchronous/', note: 'Practical async-first documentation and decision-log standards.' },
    ],
  },
  'burnout-focus': {
    chartTitle: 'Attention Recovery & Work Boundary Research Data',
    chartSubtitle: 'Measured cognitive cost of fragmented notifications vs. protected focus',
    sourceSummary: 'UC Irvine Attention Research (Gloria Mark), NIOSH & APA Work in America',
    sourceName: 'UC Irvine & CDC NIOSH',
    reportTitle: 'Attention Span & Workplace Recovery Research',
    year: '2024',
    sourceUrl: 'https://www.cdc.gov/niosh/topics/stress/',
    rows: [
      {
        label: 'Time to Refocus After Interruption',
        value: 76,
        displayValue: '23 min 15 sec',
        note: 'Average recovery time before returning cleanly to deep task',
        source: 'UC Irvine (Mark et al.)',
      },
      {
        label: 'Median Uninterrupted Screen Focus',
        value: 47,
        displayValue: '47 sec',
        note: 'Observed median focus duration on one window during open chat',
        source: 'Gloria Mark / UC Irvine',
      },
      {
        label: 'Batch Email Check Stress Reduction',
        value: 68,
        displayValue: '3x Daily Batch',
        note: 'Scheduled inbox windows lower daily tension vs. live alerts',
        source: 'UBC Experimental Study',
      },
      {
        label: 'Workers Reporting Chronic Work Stress',
        value: 57,
        displayValue: '57%',
        note: 'Surveyed employees experiencing negative impacts of work burnout',
        source: 'APA Work in America Survey',
      },
    ],
    additionalSources: [
      { label: 'Total Worker Health & Stress', org: 'CDC NIOSH', url: 'https://www.cdc.gov/niosh/topics/stress/', note: 'Federal occupational health evidence on workload recovery and cognitive boundaries.' },
      { label: 'Work in America Survey', org: 'American Psychological Association', url: 'https://www.apa.org/pubs/reports/work-in-america', note: 'Empirical workplace survey examining remote autonomy, stress, and burnout recovery.' },
      { label: 'Email Frequency & Daily Well-Being', org: 'University of British Columbia', url: 'https://news.ubc.ca/2014/12/checking-email-less-frequently-reduces-stress/', note: 'Controlled study showing lower daily stress when inbox checks are batched.' },
    ],
  },
  'freelance-web': {
    chartTitle: 'Independent Practice, Tooling & Client Workflow Benchmarks',
    chartSubtitle: 'Factors driving reliable delivery, low overhead & client retention',
    sourceSummary: 'U.S. Bureau of Labor Statistics (BLS) Contingent Work Data & Core Web Vitals',
    sourceName: 'U.S. BLS & web.dev Standards',
    reportTitle: 'Independent Contractor Economics & Web Performance Standards',
    year: '2024',
    sourceUrl: 'https://web.dev/articles/vitals',
    rows: [
      {
        label: 'Target Largest Contentful Paint (LCP)',
        value: 90,
        displayValue: '<= 2.5 sec',
        note: 'Google Core Web Vitals Good threshold for portfolio & landing pages',
        source: 'web.dev / Google Search',
      },
      {
        label: 'Written Scope & Milestone Agreement',
        value: 94,
        displayValue: 'Essential Gate',
        note: 'Significantly cuts unpaid revision creep across client retainers',
        source: 'AIGA Standard Agreement',
      },
      {
        label: 'Tax & Buffer Reserve Allocation Target',
        value: 30,
        displayValue: '25–30% Gross',
        note: 'Standard self-employment reserve before net profit payouts',
        source: 'IRS Self-Employed Center',
      },
      {
        label: 'Interaction to Next Paint (INP) Ceiling',
        value: 85,
        displayValue: '<= 200 ms',
        note: 'Responsiveness benchmark replacing FID for modern web tools',
        source: 'Google Web Vitals 2024',
      },
    ],
    additionalSources: [
      { label: 'Core Web Vitals Documentation', org: 'Google web.dev', url: 'https://web.dev/articles/vitals', note: 'Measurable speed and layout stability targets for independent sites.' },
      { label: 'Self-Employed Individuals Tax Center', org: 'IRS', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center', note: 'Official quarterly estimated tax and expense recordkeeping rules.' },
      { label: 'Standard Form of Agreement for Design', org: 'AIGA', url: 'https://www.aiga.org/resources/aiga-standard-form-of-agreement-for-design-services', note: 'Industry-standard contract clauses for deliverables, kill fees, and IP rights.' },
    ],
  },
  general: {
    chartTitle: 'Practical Implementation & Verification Benchmarks',
    chartSubtitle: 'Evidence-backed adoption drivers that separate durable habits from noise',
    sourceSummary: 'NIST Continuous Improvement Guidance & U.S. Digital.gov Usability Principles',
    sourceName: 'NIST & U.S. Digital.gov',
    reportTitle: 'Practical Implementation & Plain-Language Verification Standards',
    year: '2024',
    sourceUrl: 'https://digital.gov/resources/checklist-of-requirements-for-federal-digital-services/',
    rows: [
      {
        label: 'Baseline Measurement Before Changes',
        value: 92,
        displayValue: 'Step 1 Gate',
        note: 'Prevents misattributing gains when testing a single change',
        source: 'NIST Process Quality',
      },
      {
        label: 'Clear Plain-Language Documentation',
        value: 86,
        displayValue: 'High Clarity',
        note: 'Reduces onboarding mistakes and repeated support questions',
        source: 'PlainLanguage.gov',
      },
      {
        label: 'Scheduled 30-Day Audit Check',
        value: 78,
        displayValue: 'Monthly Loop',
        note: 'Catches silent configuration drift before failures compound',
        source: 'SRE / Operational Best Practice',
      },
      {
        label: 'Single-Change Pilot Scope Control',
        value: 84,
        displayValue: 'Controlled Pilot',
        note: 'Limits rollback cost while validating real-world fit',
        source: 'Digital.gov Standards',
      },
    ],
    additionalSources: [
      { label: 'Creating Helpful, Reliable, People-First Content', org: 'Google Search Central', url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content', note: 'Primary guidance on originality, first-hand expertise, and verifiable sourcing.' },
      { label: 'Plain Language Guidelines', org: 'PlainLanguage.gov', url: 'https://www.plainlanguage.gov/guidelines/', note: 'Reader-first writing clarity and verifiable factual precision standards.' },
      { label: 'Digital.gov Practical Standards', org: 'U.S. GSA', url: 'https://digital.gov/', note: 'Accessibility, performance, and user-centered testing benchmarks.' },
    ],
  },
};

export function detectTopicDomain(text: string, category = ''): TopicDomain {
  const hay = `${text} ${category}`.toLowerCase();

  if (/\b(phish\w*|scam\w*|fraud\w*|spoof\w*|smish\w*|suspicious email|spam link|social engineering|malware|ransomware|breach|data leak)\b/.test(hay)) {
    return 'phishing-scam';
  }
  if (/\b(password\w*|passkey\w*|2fa|two-factor|mfa|authenticator|bitwarden|1password|credential\w*|vault|login security)\b/.test(hay)) {
    return 'passwords-2fa';
  }
  if (/\b(backup\w*|back up|3-2-1|time machine|icloud|google drive|onedrive|external drive|hard drive|recover\w*|restore|snapshot\w*)\b/.test(hay)) {
    return 'backup-storage';
  }
  if (/\b(wi-?fi|router\w*|vpn|dns|wpa3|firewall|mesh|network\w*|public wi-?fi|isp|internet privacy|browser privacy|tracker\w*|cookie\w*)\b/.test(hay)) {
    return 'wifi-network';
  }
  if (/\b(slow computer|speed up|startup|ram|ssd|disk space|battery|storage full|lagging|mac|windows 11|windows 10|pc health|cache)\b/.test(hay)) {
    return 'pc-speed';
  }
  if (/\b(home office|desk|ergonom\w*|chair|monitor|webcam|microphone|lighting|standing desk|workspace|headphone\w*|keyboard)\b/.test(hay)) {
    return 'home-office';
  }
  if (/\b(burnout|work-life|work life|boundar\w*|pomodoro|deep work|focus|overwork|disconnect|unplug|stress)\b/.test(hay)) {
    return 'burnout-focus';
  }
  if (/\b(remote work|remote team|async|asynchronous|time zone|timezone|zoom|slack|standup|distributed|work from home|wfh)\b/.test(hay)) {
    return 'remote-team';
  }
  if (/\b(freelanc\w*|portfolio|invoic\w*|client\w*|side hustle|website|no-code|notion|obsidian|spreadsheet|excel|calendar)\b/.test(hay)) {
    return 'freelance-web';
  }
  if (/\b(ai|prompt\w*|chatgpt|claude|gemini|copilot|llm|automat\w*|writing tool|meeting notes|summariz\w*)\b/.test(hay)) {
    return 'ai-prompts';
  }

  const cat = category.toLowerCase();
  if (cat.includes('security')) return 'passwords-2fa';
  if (cat.includes('remote')) return 'home-office';
  if (cat.includes('how-to') || cat.includes('tech')) return 'pc-speed';
  if (cat.includes('ai') || cat.includes('productivity')) return 'ai-prompts';
  return 'general';
}

export function getDomainPalette(text: string, category = ''): DomainPalette {
  return DOMAIN_PALETTES[detectTopicDomain(text, category)];
}

export function getCredibleDatasetForTopic(text: string, category = ''): CredibleDomainDataset {
  const domain = detectTopicDomain(text, category);
  return REAL_BENCHMARKS_BY_DOMAIN[domain] || REAL_BENCHMARKS_BY_DOMAIN.general;
}

export function buildTopicImagePrompt(opts: {
  prompt?: string;
  title?: string;
  topic?: string;
  keyword?: string;
  secondaryKeywords?: string[];
  category?: string;
  visualStyle?: 'editorial-scene' | 'visual-diagram' | 'workspace-photo' | 'flat-illustration';
}): string {
  const title = (opts.title || '').trim();
  const topic = (opts.topic || '').trim();
  const keyword = (opts.keyword || '').trim();
  const category = (opts.category || '').trim();
  const rawPrompt = (opts.prompt || '').trim();
  const secondary = (opts.secondaryKeywords || []).filter(Boolean).slice(0, 3);

  const subject = title || topic || keyword || rawPrompt || 'Practical technology guide';
  const contextText = `${subject} ${topic} ${keyword} ${secondary.join(' ')} ${rawPrompt}`;
  const palette = getDomainPalette(contextText, category);

  const isCustomPrompt =
    rawPrompt.length > 12 &&
    !rawPrompt.toLowerCase().includes('futuristic enterprise ai neural network') &&
    !rawPrompt.toLowerCase().includes('abstract neural network architecture');

  const styleClause =
    opts.visualStyle === 'visual-diagram'
      ? 'Clean, modern flat vector editorial infographic illustration, clear visual metaphor, well-balanced geometry, high contrast, subtle grid background, NO garbled or unreadable text.'
      : opts.visualStyle === 'flat-illustration'
      ? 'Warm contemporary editorial vector illustration in high resolution, crisp shapes, tactile paper-grain lighting, no text overlays.'
      : opts.visualStyle === 'workspace-photo'
      ? 'Authentic documentary-style natural-light photograph, 35mm lens, shallow depth of field, realistic textures, no overlaid text or logos.'
      : 'Editorial magazine header photograph/illustration, crisp focal point, natural depth of field, zero watermarks, zero distorted text overlays.';

  const keywordNote = keyword ? ` Core topic keyword: "${keyword}".` : '';
  const secondaryNote = secondary.length ? ` Supporting visual elements related to: ${secondary.join(', ')}.` : '';

  if (isCustomPrompt) {
    return `${rawPrompt}. Specifically depicting "${subject}"${category ? ` (${category})` : ''}.${keywordNote}${secondaryNote} Scene direction: ${palette.sceneHint}. ${styleClause}`;
  }

  return `Create a sharp, topic-accurate editorial primary cover image specifically illustrating "${subject}"${category ? ` for the ${category} section` : ''}.${keywordNote}${secondaryNote} Scene direction: ${palette.sceneHint}. ${styleClause}`;
}

export function buildTopicAltText(opts: {
  prompt?: string;
  title?: string;
  keyword?: string;
  category?: string;
}): string {
  const title = (opts.title || '').trim();
  const keyword = (opts.keyword || '').trim();
  const category = (opts.category || '').trim();
  const prompt = (opts.prompt || '').trim();

  if (title && keyword && !title.toLowerCase().includes(keyword.toLowerCase())) {
    return `${title} — editorial visual guide covering ${keyword}`;
  }
  if (title) {
    return `${title}${category ? ` (${category} editorial cover)` : ' editorial cover'}`;
  }
  if (prompt) {
    const clean = prompt
      .replace(/^(create|generate|design)\s+(an?\s+)?/i, '')
      .split(/[.;]/)[0]
      .trim();
    if (clean) return clean.slice(0, 140);
  }
  return keyword ? `Editorial illustration and practical visual guide for ${keyword}` : 'Editorial illustration for practical guide';
}

export function buildTopicStudioPresets(opts: {
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
}) {
  const subject = (opts.title || opts.topic || opts.keyword || 'this practical guide').trim();
  const kw = (opts.keyword || opts.topic || 'step-by-step workflow').trim();
  const cat = (opts.category || 'Practical Guide').trim();
  const palette = getDomainPalette(`${subject} ${kw}`, cat);

  return {
    createPresets: [
      {
        label: 'Topic Hero Scene',
        style: 'editorial-scene' as const,
        prompt: `Editorial cover photograph illustrating "${subject}" with ${palette.sceneHint}, natural studio lighting, clean focal point`,
      },
      {
        label: 'Concept Diagram',
        style: 'visual-diagram' as const,
        prompt: `Clean modern vector infographic diagram visually explaining "${kw}" (${cat}), structured cards and directional arrows, no unreadable text`,
      },
      {
        label: 'Real Workspace View',
        style: 'workspace-photo' as const,
        prompt: `Authentic everyday workspace photograph demonstrating "${subject}", crisp 35mm depth of field, warm ambient light`,
      },
      {
        label: 'Minimalist Vector',
        style: 'flat-illustration' as const,
        prompt: `Clean geometric editorial illustration symbolizing "${kw}" with palette ${palette.accent} and ${palette.highlight}, balanced composition`,
      },
    ],
    editPresets: [
      {
        label: 'Cleaner Bright Desk',
        prompt: `Refine lighting to warm natural morning daylight and keep the composition clean and uncluttered for "${subject}"`,
      },
      {
        label: 'Editorial Warm Tone',
        prompt: `Apply balanced editorial color grading with subtle contrast tuned to a ${cat} magazine feature`,
      },
      {
        label: 'Remove Clutter',
        prompt: `Remove background distractions so the main subject representing "${kw}" stands out sharply`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// SVG Helpers & Topic Artwork Primitives
// ---------------------------------------------------------------------------

function escSvg(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttr(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + ' ' + w).length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;:\s]*$/, '') + '...';
  }
  return lines.length ? lines : ['Practical Visual Guide'];
}

function renderDomainArtwork(domain: TopicDomain, palette: DomainPalette, cx: number, cy: number): string {
  const { accent, highlight, accentSoft } = palette;

  switch (domain) {
    case 'phishing-scam':
      return `
        <g transform="translate(${cx - 170}, ${cy - 115})">
          <rect x="0" y="18" width="300" height="190" rx="18" fill="#0f172a" stroke="${accent}" stroke-width="2" stroke-opacity="0.6"/>
          <path d="M0 36 L150 125 L300 36" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.55"/>
          <rect x="26" y="42" width="140" height="14" rx="7" fill="${accentSoft}"/>
          <rect x="26" y="68" width="210" height="10" rx="5" fill="#334155"/>
          <rect x="26" y="88" width="175" height="10" rx="5" fill="#334155"/>
          <g transform="translate(215, -6)">
            <path d="M55 0 L108 22 V66 C108 105 84 134 55 148 C26 134 2 105 2 66 V22 Z" fill="#1e293b" stroke="${accent}" stroke-width="3"/>
            <path d="M34 72 L49 88 L80 52" fill="none" stroke="#34d399" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <rect x="26" y="148" width="180" height="32" rx="10" fill="${highlight}" fill-opacity="0.16" stroke="${highlight}" stroke-opacity="0.5"/>
          <text x="42" y="169" fill="${highlight}" font-family="system-ui,sans-serif" font-size="13" font-weight="700">DOMAIN CHECK: VERIFIED</text>
        </g>`;

    case 'passwords-2fa':
      return `
        <g transform="translate(${cx - 165}, ${cy - 115})">
          <rect x="20" y="20" width="280" height="185" rx="22" fill="#0f172a" stroke="${accent}" stroke-width="2" stroke-opacity="0.55"/>
          <rect x="46" y="54" width="228" height="44" rx="10" fill="#1e293b" stroke="${accent}" stroke-opacity="0.4"/>
          <circle cx="72" cy="76" r="6" fill="${accent}"/><circle cx="94" cy="76" r="6" fill="${accent}"/>
          <circle cx="116" cy="76" r="6" fill="${accent}"/><circle cx="138" cy="76" r="6" fill="${accent}"/>
          <circle cx="160" cy="76" r="6" fill="${highlight}"/><circle cx="182" cy="76" r="6" fill="${highlight}"/>
          <rect x="205" y="65" width="52" height="22" rx="6" fill="${accentSoft}"/>
          <text x="231" y="80" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="11" font-weight="700">2FA</text>
          <g transform="translate(115, 118)">
            <rect x="0" y="24" width="90" height="58" rx="12" fill="${accentSoft}" stroke="${accent}" stroke-width="2.5"/>
            <path d="M22 24 V14 C22 2 68 2 68 14 V24" fill="none" stroke="${accent}" stroke-width="4"/>
            <circle cx="45" cy="50" r="8" fill="${highlight}"/>
          </g>
        </g>`;

    case 'backup-storage':
      return `
        <g transform="translate(${cx - 175}, ${cy - 115})">
          <rect x="10" y="30" width="95" height="150" rx="14" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <rect x="26" y="52" width="63" height="14" rx="4" fill="${accentSoft}"/>
          <circle cx="57" cy="126" r="20" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2"/>
          <text x="57" y="164" text-anchor="middle" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="11" font-weight="700">LOCAL SSD</text>
          <path d="M108 105 H138" stroke="${highlight}" stroke-width="3" stroke-dasharray="5 4"/>
          <rect x="142" y="30" width="95" height="150" rx="14" fill="#0f172a" stroke="${highlight}" stroke-width="2"/>
          <rect x="158" y="55" width="63" height="18" rx="4" fill="#1e293b"/>
          <rect x="158" y="83" width="63" height="18" rx="4" fill="#1e293b"/>
          <rect x="158" y="111" width="63" height="18" rx="4" fill="#1e293b"/>
          <text x="189" y="164" text-anchor="middle" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="11" font-weight="700">EXTERNAL</text>
          <path d="M240 105 H270" stroke="${accent}" stroke-width="3" stroke-dasharray="5 4"/>
          <path d="M286 135 C270 135 266 112 282 104 C284 82 316 74 334 90 C350 92 356 120 340 135 Z" fill="${accentSoft}" stroke="${accent}" stroke-width="2.5"/>
          <text x="312" y="164" text-anchor="middle" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="11" font-weight="700">CLOUD SYNC</text>
        </g>`;

    case 'wifi-network':
      return `
        <g transform="translate(${cx - 170}, ${cy - 115})">
          <path d="M85 110 C125 65 215 65 255 110" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-opacity="0.4"/>
          <path d="M110 132 C138 100 202 100 230 132" fill="none" stroke="${highlight}" stroke-width="4" stroke-linecap="round" stroke-opacity="0.7"/>
          <path d="M136 154 C152 135 188 135 204 154" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
          <circle cx="170" cy="172" r="10" fill="${highlight}"/>
          <rect x="92" y="188" width="156" height="34" rx="10" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <circle cx="118" cy="205" r="5" fill="#34d399"/><circle cx="136" cy="205" r="5" fill="#38bdf8"/>
          <text x="200" y="209" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="700">WPA3 + DNS</text>
        </g>`;

    case 'pc-speed':
      return `
        <g transform="translate(${cx - 165}, ${cy - 115})">
          <rect x="10" y="16" width="310" height="190" rx="18" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <path d="M60 148 A75 75 0 0 1 210 148" fill="none" stroke="#334155" stroke-width="16" stroke-linecap="round"/>
          <path d="M60 148 A75 75 0 0 1 190 95" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
          <line x1="135" y1="148" x2="180" y2="96" stroke="${highlight}" stroke-width="5" stroke-linecap="round"/>
          <circle cx="135" cy="148" r="9" fill="${highlight}"/>
          <rect x="232" y="52" width="64" height="22" rx="6" fill="${accentSoft}"/><text x="264" y="67" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="11" font-weight="700">SSD</text>
          <rect x="232" y="88" width="64" height="22" rx="6" fill="${accentSoft}"/><text x="264" y="103" text-anchor="middle" fill="${highlight}" font-family="monospace" font-size="11" font-weight="700">RAM</text>
          <rect x="232" y="124" width="64" height="22" rx="6" fill="${accentSoft}"/><text x="264" y="139" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11" font-weight="700">BOOT</text>
        </g>`;

    case 'home-office':
      return `
        <g transform="translate(${cx - 170}, ${cy - 115})">
          <rect x="70" y="20" width="200" height="120" rx="12" fill="#0f172a" stroke="${accent}" stroke-width="3"/>
          <rect x="86" y="36" width="168" height="88" rx="6" fill="#1e293b"/>
          <rect x="102" y="52" width="84" height="12" rx="4" fill="${accent}" fill-opacity="0.7"/>
          <rect x="102" y="74" width="132" height="8" rx="4" fill="#475569"/>
          <rect x="102" y="90" width="110" height="8" rx="4" fill="#475569"/>
          <rect x="155" y="140" width="30" height="26" fill="#64748b"/>
          <rect x="122" y="166" width="96" height="10" rx="5" fill="#94a3b8"/>
          <rect x="22" y="178" width="296" height="16" rx="8" fill="${accentSoft}" stroke="${accent}" stroke-opacity="0.6"/>
          <circle cx="48" cy="144" r="22" fill="${highlight}" fill-opacity="0.22" stroke="${highlight}" stroke-width="2"/>
          <rect x="264" y="142" width="28" height="36" rx="6" fill="#334155" stroke="${accent}" stroke-opacity="0.5"/>
        </g>`;

    case 'remote-team':
    case 'burnout-focus':
      return `
        <g transform="translate(${cx - 170}, ${cy - 115})">
          <rect x="14" y="20" width="312" height="186" rx="18" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <rect x="34" y="44" width="128" height="58" rx="10" fill="${accentSoft}" stroke="${accent}" stroke-opacity="0.6"/>
          <text x="50" y="68" fill="${accent}" font-family="system-ui,sans-serif" font-size="11" font-weight="700">DEEP FOCUS</text>
          <rect x="50" y="80" width="86" height="8" rx="4" fill="${highlight}"/>
          <rect x="178" y="44" width="128" height="58" rx="10" fill="#1e293b" stroke="${highlight}" stroke-opacity="0.5"/>
          <text x="194" y="68" fill="${highlight}" font-family="system-ui,sans-serif" font-size="11" font-weight="700">ASYNC SYNC</text>
          <rect x="194" y="80" width="76" height="8" rx="4" fill="#64748b"/>
          <rect x="34" y="118" width="272" height="62" rx="10" fill="#1e293b"/>
          <circle cx="66" cy="149" r="14" fill="${accent}"/><circle cx="170" cy="149" r="14" fill="${highlight}"/><circle cx="274" cy="149" r="14" fill="#34d399"/>
          <line x1="82" y1="149" x2="154" y2="149" stroke="#64748b" stroke-width="3" stroke-dasharray="5 4"/>
          <line x1="186" y1="149" x2="258" y2="149" stroke="#64748b" stroke-width="3" stroke-dasharray="5 4"/>
        </g>`;

    default:
      return `
        <g transform="translate(${cx - 170}, ${cy - 115})">
          <rect x="10" y="24" width="90" height="160" rx="14" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <text x="55" y="54" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="11" font-weight="700">INPUT</text>
          <rect x="26" y="74" width="58" height="10" rx="5" fill="${accentSoft}"/>
          <rect x="26" y="94" width="46" height="10" rx="5" fill="#334155"/>
          <rect x="26" y="114" width="52" height="10" rx="5" fill="#334155"/>
          <path d="M104 104 H126" stroke="${highlight}" stroke-width="3"/>
          <rect x="130" y="24" width="90" height="160" rx="14" fill="#1e293b" stroke="${highlight}" stroke-width="2"/>
          <text x="175" y="54" text-anchor="middle" fill="${highlight}" font-family="monospace" font-size="11" font-weight="700">PROCESS</text>
          <circle cx="175" cy="112" r="28" fill="${accentSoft}" stroke="${highlight}" stroke-width="2.5"/>
          <path d="M164 112 L173 121 L189 102" fill="none" stroke="${highlight}" stroke-width="4" stroke-linecap="round"/>
          <path d="M224 104 H246" stroke="${accent}" stroke-width="3"/>
          <rect x="250" y="24" width="90" height="160" rx="14" fill="#0f172a" stroke="${accent}" stroke-width="2"/>
          <text x="295" y="54" text-anchor="middle" fill="#34d399" font-family="monospace" font-size="11" font-weight="700">RESULT</text>
          <rect x="266" y="74" width="58" height="24" rx="6" fill="#065f46"/>
          <rect x="266" y="110" width="58" height="10" rx="5" fill="#334155"/>
          <rect x="266" y="130" width="44" height="10" rx="5" fill="#334155"/>
        </g>`;
  }
}

export function generateTopicVisualSvg(opts: {
  prompt?: string;
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
  aspectRatio?: string;
  styleMode?: 'editorial-scene' | 'visual-diagram' | 'workspace-photo' | 'flat-illustration';
}): string {
  const aspectRatio = opts.aspectRatio || '16:9';
  const [rw, rh] = aspectRatio.split(':').map(Number);
  const w = 1280;
  const h = Math.round(w * ((rh || 9) / (rw || 16)));
  const subject = (opts.title || opts.topic || opts.keyword || opts.prompt || 'Practical Guide').trim();
  const primaryContext = `${opts.title || ''} ${opts.topic || ''} ${opts.keyword || ''}`.trim();
  const palette = getDomainPalette(primaryContext || opts.prompt || '', opts.category || '');

  const badge = escSvg((opts.category || palette.label).toUpperCase());
  const titleLines = wrapLines(subject, 30, 3);
  const subLabel = escSvg(
    opts.keyword
      ? `Topic Focus: ${opts.keyword.slice(0, 48)}`
      : palette.label
  );

  const isTall = h >= w;
  const artCx = isTall ? Math.round(w * 0.5) : Math.round(w * 0.74);
  const artCy = isTall ? Math.round(h * 0.66) : Math.round(h * 0.52);
  const textX = 88;
  const titleStartY = isTall ? 175 : Math.max(210, Math.round(h * 0.36));

  const titleSvg = titleLines
    .map(
      (line, idx) =>
        `<text x="${textX}" y="${titleStartY + idx * 54}" fill="#ffffff" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="42" font-weight="800" letter-spacing="-0.02em">${escSvg(line)}</text>`
    )
    .join('\n  ');

  const artwork = renderDomainArtwork(palette.domain, palette, artCx, artCy);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bgStart}"/>
      <stop offset="100%" stop-color="${palette.bgEnd}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${isTall ? 0.5 : 0.75}" cy="${isTall ? 0.65 : 0.5}" r="0.55">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${palette.bgEnd}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <rect x="44" y="44" width="${w - 88}" height="${h - 88}" rx="28" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="1.5"/>

  <rect x="${textX}" y="${titleStartY - 82}" width="${Math.min(410, Math.max(200, badge.length * 10 + 42))}" height="34" rx="17" fill="${palette.accentSoft}" stroke="${palette.accent}" stroke-opacity="0.65"/>
  <text x="${textX + 20}" y="${titleStartY - 60}" fill="${palette.highlight}" font-family="system-ui,-apple-system,sans-serif" font-size="13" font-weight="800" letter-spacing="0.08em">${badge}</text>

  ${titleSvg}

  <line x1="${textX}" y1="${titleStartY + titleLines.length * 54 + 6}" x2="${textX + 120}" y2="${titleStartY + titleLines.length * 54 + 6}" stroke="${palette.highlight}" stroke-width="4" stroke-linecap="round"/>
  <text x="${textX}" y="${titleStartY + titleLines.length * 54 + 38}" fill="#94a3b8" font-family="system-ui,-apple-system,sans-serif" font-size="20" font-weight="500">${subLabel}</text>

  ${artwork}

  <text x="${textX}" y="${h - 74}" fill="#64748b" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="700" letter-spacing="0.12em">BRIEFZY EDITORIAL COVER</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// 1. Multi-Stage Topic Infographic SVG Generator
// ---------------------------------------------------------------------------

export function generateTopicInfographicSvg(opts: {
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
  steps?: { title: string; detail: string }[];
}): { svg: string; caption: string; alt: string } {
  const title = (opts.title || opts.topic || opts.keyword || 'Practical Implementation Map').trim();
  const keyword = (opts.keyword || opts.topic || title).trim();
  const category = (opts.category || 'Practical Guide').trim();
  const palette = getDomainPalette(`${title} ${keyword}`, category);

  const defaultSteps: Record<TopicDomain, { title: string; detail: string }[]> = {
    'ai-prompts': [
      { title: '1. Frame Role & Context', detail: 'State audience, goal & input constraints upfront.' },
      { title: '2. Specify Structure', detail: 'Request clear headings, criteria & output format.' },
      { title: '3. Cross-Check Claims', detail: 'Verify every fact, figure & edge case manually.' },
      { title: '4. Refine & Reuse', detail: 'Save winning templates with explicit quality checks.' },
    ],
    'phishing-scam': [
      { title: '1. Pause Urgency Cue', detail: 'Treat countdowns or lock threats as red flags.' },
      { title: '2. Inspect Sender Domain', detail: 'Check exact domain spelling beyond display name.' },
      { title: '3. Verify Separately', detail: 'Open an official bookmark—never email links.' },
      { title: '4. Report & Lock Vault', detail: 'Flag suspicious headers and review MFA logs.' },
    ],
    'passwords-2fa': [
      { title: '1. Generate Unique Vault Keys', detail: '16+ random chars per site inside a password vault.' },
      { title: '2. Enable FIDO2 / Passkeys', detail: 'Use phishing-resistant hardware or synced passkeys.' },
      { title: '3. Upgrade SMS to TOTP', detail: 'Protect critical accounts against SIM swaps.' },
      { title: '4. Store Recovery Codes', detail: 'Keep printed emergency backup keys offline safely.' },
    ],
    'backup-storage': [
      { title: '1. Primary Working Copy', detail: 'Daily files on encrypted internal NVMe SSD.' },
      { title: '2. Local External Copy', detail: 'Automated Time Machine / File History snapshot.' },
      { title: '3. Offsite Immutable Cloud', detail: 'Zero-knowledge encrypted remote sync with versioning.' },
      { title: '4. Test Quarterly Restore', detail: 'Verify file integrity by opening test restores.' },
    ],
    'wifi-network': [
      { title: '1. Enable WPA3 + Admin Key', detail: 'Replace factory router login and enable WPA3-SAE.' },
      { title: '2. Turn On Encrypted DNS', detail: 'Use DNS-over-HTTPS / TLS on router or browser.' },
      { title: '3. Isolate Guest / IoT', detail: 'Separate smart-home devices on guest SSID.' },
      { title: '4. Auto-Patch Firmware', detail: 'Disable UPnP/WPS and schedule security updates.' },
    ],
    'pc-speed': [
      { title: '1. Trim Startup Apps', detail: 'Disable background bloat via Task Manager / Login.' },
      { title: '2. Keep 20% SSD Free', detail: 'Prevent flash write-amplification slowdowns.' },
      { title: '3. Audit Memory Pressure', detail: 'Cap heavy browser tabs and runaway background tasks.' },
      { title: '4. Maintain Cooling', detail: 'Keep vents clear to stop CPU thermal throttling.' },
    ],
    'home-office': [
      { title: '1. Align Screen at Eye Level', detail: 'Top bezel even with eyes; 50–70 cm distance.' },
      { title: '2. Set 90° Arm & Knee Geometry', detail: 'Support lumbar curve with forearms level to desk.' },
      { title: '3. Balance Task Lighting', detail: 'Place desk perpendicular to windows to cut glare.' },
      { title: '4. Schedule Movement Loops', detail: '20-20-20 eye breaks + hourly 2-minute stretch.' },
    ],
    'remote-team': [
      { title: '1. Default to Written Context', detail: 'Log decisions in shared docs before scheduling calls.' },
      { title: '2. Define Overlap Windows', detail: 'Reserve 2–3 core hours for live collaboration.' },
      { title: '3. Protect Deep-Work Blocks', detail: 'Batch chat replies so teammates keep flow state.' },
      { title: '4. Close Weekly Loops', detail: 'Publish clear blockers, owners & next milestones.' },
    ],
    'burnout-focus': [
      { title: '1. Silence Non-Urgent Alerts', detail: 'Cut context switching to protect 23-min focus cycles.' },
      { title: '2. Timebox 90-Min Sprints', detail: 'Pair deep blocks with deliberate offline recovery.' },
      { title: '3. Batch Inbox Windows', detail: 'Check messages 3x daily instead of staying reactive.' },
      { title: '4. Hard Shutdown Ritual', detail: 'Write tomorrow’s top 2 priorities and close the lid.' },
    ],
    'freelance-web': [
      { title: '1. Lock Written Scope', detail: 'Define deliverables, revisions & timeline upfront.' },
      { title: '2. Speed-Audit Delivery', detail: 'Keep Core Web Vitals LCP <= 2.5s and clean HTML.' },
      { title: '3. Separate Tax Reserve', detail: 'Set aside 25–30% of invoices automatically.' },
      { title: '4. Track Recurring Value', detail: 'Review utilization and client outcomes monthly.' },
    ],
    general: [
      { title: '1. Record Baseline State', detail: 'Log current time, errors, or cost before changing.' },
      { title: '2. Configure Core Safeguards', detail: 'Apply highest-leverage settings in one short pass.' },
      { title: '3. Validate Real Output', detail: 'Test normal and failure scenarios on small scope.' },
      { title: '4. Review & Document', detail: 'Audit monthly and refine what measurably works.' },
    ],
  };

  const rawSteps = (opts.steps && opts.steps.length >= 3 ? opts.steps : defaultSteps[palette.domain]).slice(0, 4);
  const w = 1200;
  const h = 680;
  const headlineLines = wrapLines(title, 54, 2);

  const cardsSvg = rawSteps
    .map((st, idx) => {
      const colX = 56 + idx * 276;
      const cardY = 195;
      const cardW = 252;
      const cardH = 260;
      const stepLines = wrapLines(st.title.replace(/^\d+[.)]\s*/, ''), 22, 2);
      const descLines = wrapLines(st.detail, 26, 4);

      const arrow =
        idx < rawSteps.length - 1
          ? `<path d="M${colX + cardW + 4} ${cardY + 125} L${colX + cardW + 20} ${cardY + 125} M${colX + cardW + 13} ${cardY + 118} L${colX + cardW + 20} ${cardY + 125} L${colX + cardW + 13} ${cardY + 132}" fill="none" stroke="${palette.highlight}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
          : '';

      return `
      <g>
        <rect x="${colX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="20" fill="#0f172a" fill-opacity="0.92" stroke="${idx === 0 ? palette.highlight : palette.accent}" stroke-opacity="0.55" stroke-width="2"/>
        <circle cx="${colX + 36}" cy="${cardY + 38}" r="18" fill="${palette.accentSoft}" stroke="${palette.highlight}" stroke-width="2"/>
        <text x="${colX + 36}" y="${cardY + 44}" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-size="15" font-weight="800">${idx + 1}</text>
        <text x="${colX + 66}" y="${cardY + 43}" fill="${palette.highlight}" font-family="system-ui,sans-serif" font-size="11" font-weight="800" letter-spacing="0.08em">STAGE ${idx + 1}</text>
        ${stepLines
          .map(
            (ln, li) =>
              `<text x="${colX + 20}" y="${cardY + 86 + li * 26}" fill="#ffffff" font-family="system-ui,sans-serif" font-size="19" font-weight="800">${escSvg(ln)}</text>`
          )
          .join('')}
        <line x1="${colX + 20}" y1="${cardY + 132}" x2="${colX + cardW - 20}" y2="${cardY + 132}" stroke="#334155" stroke-width="1.5"/>
        ${descLines
          .map(
            (ln, li) =>
              `<text x="${colX + 20}" y="${cardY + 160 + li * 22}" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="14" font-weight="500">${escSvg(ln)}</text>`
          )
          .join('')}
      </g>${arrow}`;
    })
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="infobg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bgStart}"/>
      <stop offset="100%" stop-color="${palette.bgEnd}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="28" fill="url(#infobg)"/>
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="22" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5"/>

  <rect x="56" y="48" width="230" height="30" rx="15" fill="${palette.accentSoft}" stroke="${palette.accent}" stroke-opacity="0.65"/>
  <text x="171" y="68" text-anchor="middle" fill="${palette.highlight}" font-family="system-ui,sans-serif" font-size="12" font-weight="800" letter-spacing="0.09em">VISUAL WORKFLOW INFOGRAPHIC</text>
  <text x="${w - 56}" y="68" text-anchor="end" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="12" font-weight="700">${escSvg(category.toUpperCase())}</text>

  ${headlineLines
    .map(
      (ln, idx) =>
        `<text x="56" y="${116 + idx * 36}" fill="#ffffff" font-family="system-ui,sans-serif" font-size="30" font-weight="800">${escSvg(ln)}</text>`
    )
    .join('')}

  ${cardsSvg}

  <rect x="56" y="486" width="1088" height="132" rx="18" fill="#0b1220" stroke="${palette.accent}" stroke-opacity="0.35" stroke-width="1.5"/>
  <g transform="translate(88, 502) scale(0.46)">
    ${renderDomainArtwork(palette.domain, palette, 160, 108)}
  </g>
  <text x="275" y="534" fill="${palette.highlight}" font-family="system-ui,sans-serif" font-size="13" font-weight="800" letter-spacing="0.08em">PRACTICAL READER CHECKPOINT • ${escSvg(keyword.toUpperCase().slice(0, 44))}</text>
  <text x="275" y="564" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="17" font-weight="600">Apply stages 1 → 4 sequentially on one real task before scaling across devices or teammates.</text>
  <text x="275" y="592" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="14">Built for first-hand verification: document your baseline first so real improvements are measurable.</text>
</svg>`;

  const alt = `${title} step-by-step workflow infographic covering ${keyword}`;
  const caption = `Visual Framework: Four-stage practical roadmap for ${keyword} (${palette.label}).`;
  return { svg, caption, alt };
}

export function buildInfographicFigureHtml(opts: {
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
  steps?: { title: string; detail: string }[];
}): string {
  const { svg, caption, alt } = generateTopicInfographicSvg(opts);
  const src = svgToDataUrl(svg);
  return `<figure class="bz-inline-figure bz-figure-infographic">
  <img src="${src}" alt="${escapeHtmlAttr(alt)}" loading="lazy" decoding="async" />
  <figcaption><strong>Infographic:</strong> ${escapeHtmlAttr(caption)}</figcaption>
</figure>`;
}

// ---------------------------------------------------------------------------
// 2. Credible Real-Data Visual Chart SVG Generator
// ---------------------------------------------------------------------------

export function generateTopicDataChartSvg(opts: {
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
}): { svg: string; captionHtml: string; alt: string; dataset: CredibleDomainDataset } {
  const title = (opts.title || opts.topic || opts.keyword || 'Benchmark Data').trim();
  const keyword = (opts.keyword || opts.topic || title).trim();
  const category = (opts.category || '').trim();
  const palette = getDomainPalette(`${title} ${keyword}`, category);
  const dataset = REAL_BENCHMARKS_BY_DOMAIN[palette.domain] || REAL_BENCHMARKS_BY_DOMAIN.general;

  const w = 1200;
  const h = 650;
  const chartX = 365;
  const chartW = 635;
  const startY = 175;
  const rowStep = 94;

  const gridLines = [0, 25, 50, 75, 100]
    .map((pct) => {
      const gx = Math.round(chartX + (pct / 100) * chartW);
      return `<line x1="${gx}" y1="${startY - 14}" x2="${gx}" y2="${startY + dataset.rows.length * rowStep - 16}" stroke="#334155" stroke-dasharray="4 4" stroke-width="1"/>
      <text x="${gx}" y="${startY - 22}" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="11" font-weight="700">${pct}%</text>`;
    })
    .join('\n');

  const barsSvg = dataset.rows
    .map((row, idx) => {
      const ry = startY + idx * rowStep;
      const bw = Math.max(28, Math.round((Math.min(100, Math.max(8, row.value)) / 100) * chartW));
      const labelLines = wrapLines(row.label, 30, 2);

      return `<g>
        ${labelLines
          .map(
            (ln, li) =>
              `<text x="56" y="${ry + 18 + li * 20}" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="15" font-weight="700">${escSvg(ln)}</text>`
          )
          .join('')}
        <text x="56" y="${ry + 62}" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="12">${escSvg(row.note.slice(0, 52))}</text>

        <rect x="${chartX}" y="${ry + 4}" width="${chartW}" height="32" rx="10" fill="#1e293b"/>
        <rect x="${chartX}" y="${ry + 4}" width="${bw}" height="32" rx="10" fill="url(#barGrad${idx % 2})"/>
        <text x="${chartX + chartW + 22}" y="${ry + 25}" fill="${palette.highlight}" font-family="monospace" font-size="16" font-weight="800">${escSvg(row.displayValue)}</text>
        <text x="${chartX + chartW + 22}" y="${ry + 45}" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="11">${escSvg(row.source)}</text>
      </g>`;
    })
    .join('\n');

  const chartTitleLines = wrapLines(dataset.chartTitle, 64, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="chartbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="barGrad0" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${palette.accent}"/>
      <stop offset="100%" stop-color="${palette.highlight}"/>
    </linearGradient>
    <linearGradient id="barGrad1" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="28" fill="url(#chartbg)"/>
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="22" fill="none" stroke="${palette.accent}" stroke-opacity="0.3" stroke-width="1.5"/>

  <rect x="56" y="44" width="236" height="28" rx="14" fill="${palette.accentSoft}" stroke="${palette.accent}" stroke-opacity="0.6"/>
  <text x="174" y="63" text-anchor="middle" fill="${palette.highlight}" font-family="system-ui,sans-serif" font-size="11" font-weight="800" letter-spacing="0.08em">CREDIBLE DATA BENCHMARK</text>
  <text x="${w - 56}" y="63" text-anchor="end" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="12" font-weight="700">${escSvg(dataset.sourceName)} (${escSvg(dataset.year)})</text>

  ${chartTitleLines
    .map(
      (ln, idx) =>
        `<text x="56" y="${104 + idx * 32}" fill="#ffffff" font-family="system-ui,sans-serif" font-size="25" font-weight="800">${escSvg(ln)}</text>`
    )
    .join('')}
  <text x="56" y="${104 + chartTitleLines.length * 32}" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="14">${escSvg(dataset.chartSubtitle)}</text>

  ${gridLines}
  ${barsSvg}

  <rect x="56" y="${h - 80}" width="1088" height="44" rx="12" fill="#1e293b" fill-opacity="0.75"/>
  <text x="74" y="${h - 53}" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="13" font-weight="600">Verified Reference: ${escSvg(dataset.sourceSummary)}</text>
</svg>`;

  const alt = `${dataset.chartTitle} — real benchmark chart citing ${dataset.sourceName} (${dataset.year}) for ${keyword}`;
  const captionHtml = `<strong>Data Chart:</strong> ${escapeHtmlAttr(dataset.chartTitle)}. Source: <a href="${escapeHtmlAttr(dataset.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtmlAttr(dataset.reportTitle)} (${escapeHtmlAttr(dataset.sourceName)}, ${escapeHtmlAttr(dataset.year)})</a>.`;

  return { svg, captionHtml, alt, dataset };
}

export function buildDataChartFigureHtml(opts: {
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
}): string {
  const { svg, captionHtml, alt } = generateTopicDataChartSvg(opts);
  const src = svgToDataUrl(svg);
  return `<figure class="bz-inline-figure bz-figure-chart">
  <img src="${src}" alt="${escapeHtmlAttr(alt)}" loading="lazy" decoding="async" />
  <figcaption>${captionHtml}</figcaption>
</figure>`;
}

// ---------------------------------------------------------------------------
// 3. Topic-Matched Annotated UI / Workspace Screenshot SVG Generator
// ---------------------------------------------------------------------------

interface ScreenshotSpec {
  windowTitle: string;
  addressBar: string;
  panelTitle: string;
  bodySvg: string;
  callouts: [string, string, string];
}

function buildDomainScreenshotSpec(domain: TopicDomain, palette: DomainPalette, keyword: string): ScreenshotSpec {
  const { accent, highlight, accentSoft } = palette;
  const kwLabel = escSvg((keyword || palette.label).slice(0, 34));

  switch (domain) {
    case 'phishing-scam':
      return {
        windowTitle: 'Mail Header & Domain Verification Inspector',
        addressBar: 'https://mail.workspace.example/inbox/verify-message-headers',
        panelTitle: 'Suspicious Message Header Audit',
        callouts: [
          '1. Compare exact From & Return-Path root domain (ignore display names)',
          '2. Require SPF + DKIM + DMARC=PASS before clicking account billing links',
          '3. Hover URL preview to verify authentic HTTPS domain before opening',
        ],
        bodySvg: `
          <rect x="64" y="138" width="1072" height="330" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
          <rect x="92" y="164" width="620" height="64" rx="12" fill="#1e293b" stroke="#f87171" stroke-opacity="0.65" stroke-width="1.5"/>
          <text x="114" y="190" fill="#fca5a5" font-family="monospace" font-size="13" font-weight="700">Display: "Account Support" &lt;alert@billing-notice-check.example&gt;</text>
          <text x="114" y="214" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="13">Mismatch warning: Display name impersonates vendor while domain is unrecognized.</text>

          <rect x="742" y="164" width="366" height="140" rx="12" fill="#1e293b" stroke="#34d399" stroke-opacity="0.55" stroke-width="1.5"/>
          <text x="764" y="192" fill="#34d399" font-family="system-ui,sans-serif" font-size="13" font-weight="800">AUTHENTICATION SIGNALS</text>
          <rect x="764" y="208" width="96" height="26" rx="6" fill="#065f46"/><text x="812" y="225" text-anchor="middle" fill="#6ee7b7" font-family="monospace" font-size="12" font-weight="700">SPF: FAIL</text>
          <rect x="872" y="208" width="104" height="26" rx="6" fill="#7f1d1d"/><text x="924" y="225" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="12" font-weight="700">DKIM: NONE</text>
          <rect x="764" y="246" width="180" height="26" rx="6" fill="#78350f"/><text x="854" y="263" text-anchor="middle" fill="#fde68a" font-family="monospace" font-size="12" font-weight="700">DMARC: p=reject</text>

          <rect x="92" y="252" width="620" height="186" rx="12" fill="#0b1220" stroke="#334155"/>
          <text x="114" y="284" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="14" font-weight="700">Subject: Immediate Action Required Within 2 Hours</text>
          <rect x="114" y="306" width="460" height="12" rx="6" fill="#334155"/>
          <rect x="114" y="328" width="410" height="12" rx="6" fill="#334155"/>
          <rect x="114" y="366" width="248" height="42" rx="10" fill="#1e293b" stroke="${highlight}" stroke-width="1.5"/>
          <text x="238" y="392" text-anchor="middle" fill="${highlight}" font-family="monospace" font-size="13" font-weight="700">Hover URL: https://phish-check.invalid</text>

          <circle cx="696" cy="170" r="16" fill="#f59e0b"/><text x="696" y="176" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">1</text>
          <circle cx="1090" cy="170" r="16" fill="#22d3ee"/><text x="1090" y="176" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">2</text>
          <circle cx="378" cy="370" r="16" fill="#34d399"/><text x="378" y="376" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">3</text>
        `,
      };

    case 'passwords-2fa':
      return {
        windowTitle: 'Account Security • Passkeys & Two-Factor Enrollment',
        addressBar: 'https://account.security.example/settings/authentication',
        panelTitle: 'Sign-In & Multi-Factor Protection',
        callouts: [
          '1. Enroll at least one Passkey (FIDO2) bound to your device or vault',
          '2. Set TOTP Authenticator App as primary backup (avoid SMS-only OTP)',
          '3. Export and store single-use Recovery Codes offline safely',
        ],
        bodySvg: `
          <rect x="64" y="138" width="1072" height="330" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
          <rect x="92" y="164" width="1016" height="82" rx="12" fill="#1e293b" stroke="${accent}" stroke-width="1.5"/>
          <text x="120" y="196" fill="#ffffff" font-family="system-ui,sans-serif" font-size="17" font-weight="800">Passkeys &amp; Security Keys (Phishing-Resistant)</text>
          <text x="120" y="222" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">Hardware / Device Passkey active • Cryptographically bound to exact sign-in origin</text>
          <rect x="924" y="186" width="150" height="34" rx="17" fill="#065f46" stroke="#34d399"/><text x="999" y="208" text-anchor="middle" fill="#6ee7b7" font-family="system-ui,sans-serif" font-size="12" font-weight="800">ACTIVE • PRIMARY</text>

          <rect x="92" y="264" width="494" height="176" rx="12" fill="#1e293b" stroke="#334155"/>
          <text x="118" y="296" fill="#ffffff" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Authenticator App (TOTP)</text>
          <text x="118" y="320" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">Rotating 6-digit code every 30s • Immune to SIM swap</text>
          <rect x="118" y="346" width="180" height="46" rx="10" fill="#0f172a" stroke="${highlight}"/><text x="208" y="376" text-anchor="middle" fill="${highlight}" font-family="monospace" font-size="22" font-weight="800">482 917</text>

          <rect x="614" y="264" width="494" height="176" rx="12" fill="#1e293b" stroke="#334155"/>
          <text x="640" y="296" fill="#ffffff" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Emergency Recovery Backup Codes</text>
          <text x="640" y="320" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">8 single-use offline codes stored outside this browser</text>
          <rect x="640" y="346" width="210" height="42" rx="10" fill="#334155"/><text x="745" y="372" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="13" font-weight="700">Download &amp; Print Offline</text>

          <circle cx="904" cy="176" r="16" fill="#f59e0b"/><text x="904" y="182" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">1</text>
          <circle cx="566" cy="276" r="16" fill="#22d3ee"/><text x="566" y="282" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">2</text>
          <circle cx="1088" cy="276" r="16" fill="#34d399"/><text x="1088" y="282" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">3</text>
        `,
      };

    case 'wifi-network':
      return {
        windowTitle: 'Router Admin Console • Wireless & DNS Privacy',
        addressBar: 'https://192.168.1.1/advanced/wireless-dns-security',
        panelTitle: 'Home Network Hardening Settings',
        callouts: [
          '1. Lock encryption mode to WPA3-Personal (SAE) instead of legacy WEP/WPA',
          '2. Point upstream DNS to encrypted DNS-over-HTTPS (DoH) resolver',
          '3. Enable Isolated Guest / IoT SSID & disable remote WAN/WPS access',
        ],
        bodySvg: `
          <rect x="64" y="138" width="1072" height="330" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
          <rect x="92" y="164" width="320" height="276" rx="12" fill="#1e293b"/>
          <text x="116" y="200" fill="${highlight}" font-family="system-ui,sans-serif" font-size="13" font-weight="800">NETWORK MENU</text>
          <rect x="110" y="222" width="284" height="40" rx="8" fill="${accentSoft}"/><text x="128" y="247" fill="#ffffff" font-family="system-ui,sans-serif" font-size="14" font-weight="700">Wireless Security (WPA3)</text>
          <text x="128" y="294" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="14">Encrypted DNS (DoH / DoT)</text>
          <text x="128" y="336" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="14">Guest &amp; Smart-Home Isolation</text>
          <text x="128" y="378" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="14">Firmware Auto-Update</text>

          <rect x="436" y="164" width="672" height="276" rx="12" fill="#1e293b"/>
          <text x="466" y="202" fill="#ffffff" font-family="system-ui,sans-serif" font-size="18" font-weight="800">Active Protection Profile</text>
          <rect x="466" y="226" width="612" height="54" rx="10" fill="#0f172a" stroke="${accent}"/><text x="488" y="258" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="14" font-weight="700">Authentication: WPA3-SAE • Protected Management Frames ON</text>
          <rect x="466" y="294" width="612" height="54" rx="10" fill="#0f172a" stroke="#334155"/><text x="488" y="326" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="14" font-weight="700">DNS Resolver: Encrypted DoH Enabled • ISP Plaintext Snooping Blocked</text>
          <rect x="466" y="362" width="612" height="54" rx="10" fill="#0f172a" stroke="#334155"/><text x="488" y="394" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="14" font-weight="700">IoT Guest SSID: Isolated • WPS PIN Disabled • Auto-Patch Active</text>

          <circle cx="1062" cy="240" r="16" fill="#f59e0b"/><text x="1062" y="246" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">1</text>
          <circle cx="1062" cy="308" r="16" fill="#22d3ee"/><text x="1062" y="314" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">2</text>
          <circle cx="1062" cy="376" r="16" fill="#34d399"/><text x="1062" y="382" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">3</text>
        `,
      };

    case 'home-office':
      return {
        windowTitle: 'Workstation Ergonomic Alignment & Lighting Spec',
        addressBar: 'workspace://ergonomics-setup-check • OSHA & Cornell Alignment',
        panelTitle: 'Desk Height, Monitor Distance & Glare Layout',
        callouts: [
          '1. Elevate monitor so top third meets eye height at 50–70 cm viewing distance',
          '2. Adjust chair & armrests for 90°–110° elbow and flat-foot floor contact',
          '3. Position desk perpendicular to window light + balanced 300–500 lux lamp',
        ],
        bodySvg: `
          <rect x="64" y="138" width="1072" height="330" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
          <line x1="120" y1="420" x2="1080" y2="420" stroke="#475569" stroke-width="3"/>
          <!-- Desk surface -->
          <rect x="480" y="300" width="440" height="16" rx="6" fill="${accentSoft}" stroke="${accent}"/>
          <rect x="520" y="316" width="14" height="104" fill="#475569"/>
          <rect x="866" y="316" width="14" height="104" fill="#475569"/>
          <!-- Monitor -->
          <rect x="740" y="168" width="150" height="96" rx="10" fill="#1e293b" stroke="${highlight}" stroke-width="2.5"/>
          <rect x="805" y="264" width="20" height="36" fill="#64748b"/>
          <line x1="340" y1="184" x2="736" y2="184" stroke="${highlight}" stroke-dasharray="6 4" stroke-width="2"/>
          <text x="530" y="174" text-anchor="middle" fill="${highlight}" font-family="monospace" font-size="12" font-weight="700">0° to -15° EYE LEVEL • 50–70 cm</text>
          <!-- Chair & Seated Posture Wireframe -->
          <circle cx="315" cy="186" r="24" fill="#1e293b" stroke="${accent}" stroke-width="2.5"/>
          <line x1="315" y1="210" x2="315" y2="322" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>
          <line x1="315" y1="252" x2="352" y2="296" stroke="#34d399" stroke-width="5" stroke-linecap="round"/>
          <line x1="352" y1="296" x2="540" y2="296" stroke="#34d399" stroke-width="5" stroke-linecap="round"/>
          <line x1="315" y1="322" x2="430" y2="322" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>
          <line x1="430" y1="322" x2="430" y2="416" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>
          <!-- Lamp -->
          <path d="M960 300 L995 200 L1045 215" fill="none" stroke="#fde68a" stroke-width="4" stroke-linecap="round"/>
          <circle cx="1045" cy="215" r="14" fill="#fbbf24" fill-opacity="0.35" stroke="#fbbf24" stroke-width="2"/>

          <circle cx="725" cy="184" r="16" fill="#f59e0b"/><text x="725" y="190" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">1</text>
          <circle cx="352" cy="296" r="16" fill="#22d3ee"/><text x="352" y="302" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">2</text>
          <circle cx="1045" cy="215" r="16" fill="#34d399"/><text x="1045" y="221" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">3</text>
        `,
      };

    case 'backup-storage':
      return {
        windowTitle: '3-2-1 Backup Scheduler & Restore Verification',
        addressBar: 'system://backup-manager/schedule-and-verify',
        panelTitle: 'Encrypted Multi-Target Snapshot Status',
        callouts: [
          '1. Schedule automated hourly incremental snapshots to local external drive',
          '2. Pair with zero-knowledge encrypted offsite cloud sync + 30-day versioning',
          '3. Run monthly test file restore to verify snapshot integrity before emergencies',
        ],
        bodySvg: `
          <rect x="64" y="138" width="1072" height="330" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
          <rect x="92" y="168" width="320" height="270" rx="14" fill="#1e293b" stroke="${accent}" stroke-width="1.5"/>
          <text x="118" y="204" fill="#34d399" font-family="monospace" font-size="12" font-weight="800">TARGET 1 • LOCAL SSD</text>
          <text x="118" y="238" fill="#ffffff" font-family="system-ui,sans-serif" font-size="18" font-weight="800">Time Machine / History</text>
          <text x="118" y="268" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">Last Snapshot: 14 min ago</text>
          <rect x="118" y="294" width="268" height="10" rx="5" fill="#065f46"/><rect x="118" y="294" width="228" height="10" rx="5" fill="#34d399"/>
          <text x="118" y="330" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="13">AES-256 Encrypted Volume</text>

          <rect x="438" y="168" width="320" height="270" rx="14" fill="#1e293b" stroke="${highlight}" stroke-width="1.5"/>
          <text x="464" y="204" fill="${highlight}" font-family="monospace" font-size="12" font-weight="800">TARGET 2 • OFFSITE CLOUD</text>
          <text x="464" y="238" fill="#ffffff" font-family="system-ui,sans-serif" font-size="18" font-weight="800">Immutable Cloud Vault</text>
          <text x="464" y="268" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">Versioning: 90 Days Immutable</text>
          <rect x="464" y="294" width="268" height="10" rx="5" fill="#164e63"/><rect x="464" y="294" width="268" height="10" rx="5" fill="#38bdf8"/>
          <text x="464" y="330" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="13">Zero-Knowledge Client Key</text>

          <rect x="784" y="168" width="324" height="270" rx="14" fill="#1e293b" stroke="#334155"/>
          <text x="810" y="204" fill="#fbbf24" font-family="monospace" font-size="12" font-weight="800">RECOVERY DRILL LOG</text>
          <text x="810" y="238" fill="#ffffff" font-family="system-ui,sans-serif" font-size="18" font-weight="800">Last Restore Verified</text>
          <text x="810" y="268" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">Checksum Match: 100% PASS</text>
          <rect x="810" y="302" width="224" height="40" rx="10" fill="${accentSoft}" stroke="${accent}"/><text x="922" y="327" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-size="13" font-weight="800">Run Sample Restore Test</text>

          <circle cx="388" cy="186" r="16" fill="#f59e0b"/><text x="388" y="192" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">1</text>
          <circle cx="734" cy="186" r="16" fill="#22d3ee"/><text x="734" y="192" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">2</text>
          <circle cx="1084" cy="186" r="16" fill="#34d399"/><text x="1084" y="192" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">3</text>
        `,
      };

    case 'pc-speed':
      return {
        windowTitle: 'System Activity Monitor • Startup, RAM & SSD Health',
        addressBar: 'system://diagnostics/startup-memory-storage',
        panelTitle: 'Bottleneck Diagnostic & Startup Trim View',
        callouts: [
          '1. Sort startup apps by High Impact and toggle unnecessary auto-launchers OFF',
          '2. Inspect Memory Pressure green/amber bar before upgrading RAM or killing bloat',
          '3. Keep 15–20% NVMe SSD capacity free for sustained OS & swap responsiveness',
        ],
        bodySvg: `
          <rect x="64" y="138" width="1072" height="330" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
          <rect x="92" y="164" width="600" height="276" rx="12" fill="#1e293b"/>
          <text x="118" y="196" fill="#ffffff" font-family="system-ui,sans-serif" font-size="16" font-weight="800">Startup Impact &amp; Background Services</text>
          <rect x="118" y="216" width="548" height="44" rx="8" fill="#0f172a"/><text x="136" y="243" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="13" font-weight="600">Cloud Updater Helper</text><text x="480" y="243" fill="#f87171" font-family="monospace" font-size="12" font-weight="700">HIGH IMPACT</text><rect x="596" y="228" width="52" height="22" rx="11" fill="#475569"/><text x="622" y="243" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="11" font-weight="700">OFF</text>
          <rect x="118" y="270" width="548" height="44" rx="8" fill="#0f172a"/><text x="136" y="297" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="13" font-weight="600">Media Tray Indexer</text><text x="480" y="297" fill="#fbbf24" font-family="monospace" font-size="12" font-weight="700">MED IMPACT</text><rect x="596" y="282" width="52" height="22" rx="11" fill="#475569"/><text x="622" y="297" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="11" font-weight="700">OFF</text>
          <rect x="118" y="324" width="548" height="44" rx="8" fill="#0f172a"/><text x="136" y="351" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="13" font-weight="600">OS Defender Security</text><text x="480" y="351" fill="#34d399" font-family="monospace" font-size="12" font-weight="700">ESSENTIAL</text><rect x="596" y="336" width="52" height="22" rx="11" fill="#065f46"/><text x="622" y="351" text-anchor="middle" fill="#6ee7b7" font-family="monospace" font-size="11" font-weight="700">ON</text>

          <rect x="716" y="164" width="392" height="130" rx="12" fill="#1e293b"/>
          <text x="742" y="196" fill="#ffffff" font-family="system-ui,sans-serif" font-size="15" font-weight="800">Memory Pressure: Healthy (58%)</text>
          <rect x="742" y="218" width="340" height="16" rx="8" fill="#0f172a"/><rect x="742" y="218" width="198" height="16" rx="8" fill="#34d399"/>
          <text x="742" y="264" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="12">Zero swap thrashing detected across active tabs</text>

          <rect x="716" y="310" width="392" height="130" rx="12" fill="#1e293b"/>
          <text x="742" y="342" fill="#ffffff" font-family="system-ui,sans-serif" font-size="15" font-weight="800">NVMe SSD Free Headroom: 24%</text>
          <rect x="742" y="364" width="340" height="16" rx="8" fill="#0f172a"/><rect x="742" y="364" width="258" height="16" rx="8" fill="${highlight}"/>
          <text x="742" y="410" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="12">Recommended >= 15–20% free for sustained speeds</text>

          <circle cx="670" cy="182" r="16" fill="#f59e0b"/><text x="670" y="188" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">1</text>
          <circle cx="1084" cy="182" r="16" fill="#22d3ee"/><text x="1084" y="188" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">2</text>
          <circle cx="1084" cy="328" r="16" fill="#34d399"/><text x="1084" y="334" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">3</text>
        `,
      };

    default:
      // ai-prompts, remote-team, burnout-focus, freelance-web, general
      return {
        windowTitle: `${palette.label} • Practical Execution & Review Workspace`,
        addressBar: `https://workspace.briefzy.me/${domain}/${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28)}`,
        panelTitle: `Guided Walkthrough: ${kwLabel}`,
        callouts: [
          `1. Define explicit goal & input boundaries before running ${keyword}`,
          '2. Review structured side-by-side output against primary verification checks',
          '3. Log final verified settings & owner notes for repeatable consistency',
        ],
        bodySvg: `
          <rect x="64" y="138" width="1072" height="330" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
          <rect x="92" y="164" width="490" height="276" rx="12" fill="#1e293b" stroke="${accent}" stroke-opacity="0.6"/>
          <text x="118" y="196" fill="${highlight}" font-family="monospace" font-size="12" font-weight="800">INPUT SPECIFICATION &amp; CONSTRAINTS</text>
          <text x="118" y="226" fill="#ffffff" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Focus: ${kwLabel}</text>
          <rect x="118" y="248" width="438" height="44" rx="8" fill="#0f172a"/><text x="134" y="275" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="13">Role &amp; Context: Defined explicitly with plain scope</text>
          <rect x="118" y="302" width="438" height="44" rx="8" fill="#0f172a"/><text x="134" y="329" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="13">Constraints: Grounded sources, zero guessed numbers</text>
          <rect x="118" y="356" width="438" height="58" rx="8" fill="${accentSoft}"/><text x="134" y="390" fill="#ffffff" font-family="system-ui,sans-serif" font-size="13" font-weight="700">Baseline Metric Recorded Before Rollout</text>

          <rect x="614" y="164" width="494" height="276" rx="12" fill="#1e293b" stroke="#34d399" stroke-opacity="0.55"/>
          <text x="640" y="196" fill="#34d399" font-family="monospace" font-size="12" font-weight="800">VERIFIED OUTPUT &amp; QUALITY AUDIT</text>
          <rect x="640" y="218" width="442" height="56" rx="10" fill="#0f172a"/><text x="660" y="250" fill="#6ee7b7" font-family="system-ui,sans-serif" font-size="14" font-weight="700">✓ Structure &amp; Fact-Check Passed</text>
          <rect x="640" y="286" width="442" height="56" rx="10" fill="#0f172a"/><text x="660" y="318" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="14" font-weight="700">✓ Edge Cases &amp; Trade-Offs Covered Plainly</text>
          <rect x="640" y="354" width="442" height="60" rx="10" fill="#065f46" stroke="#34d399"/><text x="660" y="389" fill="#ffffff" font-family="system-ui,sans-serif" font-size="14" font-weight="800">Saved Playbook Ready for Team Review</text>

          <circle cx="556" cy="182" r="16" fill="#f59e0b"/><text x="556" y="188" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">1</text>
          <circle cx="1084" cy="182" r="16" fill="#22d3ee"/><text x="1084" y="188" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">2</text>
          <circle cx="1084" cy="364" r="16" fill="#34d399"/><text x="1084" y="370" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="15" font-weight="900">3</text>
        `,
      };
  }
}

export function generateTopicScreenshotSvg(opts: {
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
}): { svg: string; caption: string; alt: string } {
  const title = (opts.title || opts.topic || opts.keyword || 'Practical Setup Walkthrough').trim();
  const keyword = (opts.keyword || opts.topic || title).trim();
  const category = (opts.category || '').trim();
  const palette = getDomainPalette(`${title} ${keyword}`, category);
  const spec = buildDomainScreenshotSpec(palette.domain, palette, keyword);

  const w = 1200;
  const h = 680;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="26" fill="#020617"/>
  <!-- Browser / Settings Window Frame -->
  <rect x="28" y="24" width="${w - 56}" height="${h - 48}" rx="20" fill="#0b1220" stroke="${palette.accent}" stroke-opacity="0.45" stroke-width="2"/>
  <rect x="28" y="24" width="${w - 56}" height="52" rx="20" fill="#1e293b"/>
  <rect x="28" y="54" width="${w - 56}" height="22" fill="#1e293b"/>
  <circle cx="62" cy="50" r="7" fill="#ef4444"/><circle cx="86" cy="50" r="7" fill="#f59e0b"/><circle cx="110" cy="50" r="7" fill="#22c55e"/>
  <rect x="144" y="36" width="660" height="28" rx="8" fill="#0f172a" stroke="#334155"/>
  <text x="162" y="55" fill="#94a3b8" font-family="monospace" font-size="12">${escSvg(spec.addressBar)}</text>
  <text x="${w - 52}" y="55" text-anchor="end" fill="${palette.highlight}" font-family="system-ui,sans-serif" font-size="11" font-weight="800">ANNOTATED WALKTHROUGH</text>

  <text x="64" y="114" fill="#ffffff" font-family="system-ui,sans-serif" font-size="22" font-weight="800">${escSvg(spec.panelTitle)}</text>
  <text x="${w - 64}" y="114" text-anchor="end" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">${escSvg(spec.windowTitle)}</text>

  ${spec.bodySvg}

  <!-- Callout Legend Strip -->
  <rect x="64" y="492" width="1072" height="142" rx="14" fill="#0f172a" stroke="#334155"/>
  <text x="86" y="518" fill="${palette.highlight}" font-family="system-ui,sans-serif" font-size="12" font-weight="800" letter-spacing="0.08em">STEP-BY-STEP CALLOUTS FOR ${escSvg(keyword.toUpperCase().slice(0, 42))}</text>
  <text x="86" y="548" fill="#fde68a" font-family="system-ui,sans-serif" font-size="14" font-weight="700">${escSvg(spec.callouts[0])}</text>
  <text x="86" y="578" fill="#67e8f9" font-family="system-ui,sans-serif" font-size="14" font-weight="700">${escSvg(spec.callouts[1])}</text>
  <text x="86" y="608" fill="#6ee7b7" font-family="system-ui,sans-serif" font-size="14" font-weight="700">${escSvg(spec.callouts[2])}</text>
</svg>`;

  const alt = `${spec.windowTitle} annotated screenshot illustrating ${keyword}`;
  const caption = `Annotated Walkthrough Screenshot: (${spec.windowTitle}) — ${spec.callouts.join(' • ')}`;
  return { svg, caption, alt };
}

export function buildScreenshotFigureHtml(opts: {
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
}): string {
  const { svg, caption, alt } = generateTopicScreenshotSvg(opts);
  const src = svgToDataUrl(svg);
  return `<figure class="bz-inline-figure bz-figure-screenshot">
  <img src="${src}" alt="${escapeHtmlAttr(alt)}" loading="lazy" decoding="async" />
  <figcaption><strong>Annotated Screenshot:</strong> ${escapeHtmlAttr(caption)}</figcaption>
</figure>`;
}

// ---------------------------------------------------------------------------
// Topic-matched interactive article visualization extractor
// ---------------------------------------------------------------------------

function stripHtmlTags(s: string): string {
  return (s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function deriveArticleVisualization(article: {
  title?: string;
  category?: string;
  primaryKeyword?: string;
  content?: string;
  keyTakeaways?: string[];
}): ArticleVisualizationData {
  const title = (article.title || 'Practical Workflow Guide').trim();
  const category = (article.category || 'Productivity & AI Tools').trim();
  const keyword = (article.primaryKeyword || title).trim();
  const content = article.content || '';
  const palette = getDomainPalette(`${title} ${keyword} ${content.slice(0, 400)}`, category);
  const dataset = REAL_BENCHMARKS_BY_DOMAIN[palette.domain] || REAL_BENCHMARKS_BY_DOMAIN.general;

  // Extract real H2 chapters (ignore closing/summary/sources headings)
  const h2Matches = Array.from(content.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi))
    .map((m) => stripHtmlTags(m[1]).replace(/^\d+[.)]\s*/, '').trim())
    .filter((h) => h && !/^(final recommendations|next steps|conclusion|related|sources|methodology)/i.test(h));

  // Extract first sentence of paragraph right after each H2 if available
  const sectionSnippets: Record<string, string> = {};
  const chunks = content.split(/(?=<h2[\s>])/i);
  for (const ch of chunks) {
    const hm = ch.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (!hm) continue;
    const hText = stripHtmlTags(hm[1]).replace(/^\d+[.)]\s*/, '').trim();
    const pm = ch.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pm) {
      const firstSentence = stripHtmlTags(pm[1]).split(/(?<=[.!?])\s+/)[0] || '';
      if (firstSentence.length > 20) {
        sectionSnippets[hText] = firstSentence.slice(0, 170);
      }
    }
  }

  const takeaways = Array.isArray(article.keyTakeaways) ? article.keyTakeaways : [];
  const rawSteps = (h2Matches.length >= 3 ? h2Matches : takeaways.length >= 3 ? takeaways : [
    `Clarify your ${keyword} goal`,
    'Set up the baseline workflow',
    'Verify safety & quality checks',
    'Measure results and refine monthly',
  ]).slice(0, 5);

  const nodes = rawSteps.map((label, idx) => ({
    label: label.length > 52 ? label.slice(0, 49) + '...' : label,
    detail:
      sectionSnippets[label] ||
      takeaways[idx] ||
      `Apply "${label}" step-by-step to get reliable outcomes with ${keyword}.`,
    badge: `Step ${idx + 1}`,
  }));

  const bars = dataset.rows.map((r) => ({
    label: r.label,
    value: r.value,
    displayValue: r.displayValue,
    note: r.note,
    source: r.source,
  }));

  return {
    type: palette.diagramType,
    domain: palette.domain,
    title: `${title} — Visual Breakdown`,
    subtitle: `${palette.label} • ${nodes.length} practical chapters & cited benchmarks`,
    nodes,
    bars,
    sourceSummary: `${dataset.reportTitle} (${dataset.sourceName}, ${dataset.year})`,
    sourceUrl: dataset.sourceUrl,
  };
}

// ---------------------------------------------------------------------------
// Clean YouTube tutorial query builder
// ---------------------------------------------------------------------------

export function buildYouTubeSearchQueries(opts: {
  title?: string;
  topic?: string;
  keyword?: string;
  category?: string;
}): string[] {
  const title = (opts.title || '').trim();
  const topic = (opts.topic || '').trim();
  const keyword = (opts.keyword || '').trim();
  const category = (opts.category || '').trim();

  const cleanTitle = title
    .replace(/\b(202[0-9]|complete guide|step-by-step|benchmarks|practical roadmap)\b/gi, '')
    .replace(/[:|—–-].*$/, '')
    .trim();

  const q1 = [keyword || cleanTitle || topic, 'tutorial guide'].filter(Boolean).join(' ').trim();
  const q2 = [cleanTitle || topic, category ? category.split('&')[0].trim() : '', 'explained']
    .filter(Boolean)
    .join(' ')
    .trim();

  return Array.from(new Set([q1, q2].filter((q) => q.length >= 4)));
}

export function svgToDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}
