'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface WizardStep {
  id: string
  title: string
  description: string
  completed: boolean
}

interface AssessmentData {
  organizationInfo: {
    name: string
    industry: string
    size: string
    region: string
  }
  currentSecurity: {
    encryptionMethods: string[]
    keyManagement: string
    complianceFrameworks: string[]
    securityBudget: string
  }
  quantumAwareness: {
    awarenessLevel: string
    timelineExpectation: string
    primaryConcerns: string[]
    hasQuantumStrategy: boolean
  }
  technicalReadiness: {
    cryptoInventory: boolean
    legacySystems: string
    migrationCapability: string
    technicalExpertise: string
  }
  riskAssessment: {
    dataClassification: string[]
    threatModel: string
    businessImpact: string
    regulatoryRequirements: string[]
  }
}

interface QuantumReadinessWizardProps {
  onComplete?: (assessment: AssessmentData & { score: number; recommendations: string[] }) => void
}

export function QuantumReadinessWizard({ onComplete }: QuantumReadinessWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    organizationInfo: {
      name: '',
      industry: '',
      size: '',
      region: ''
    },
    currentSecurity: {
      encryptionMethods: [],
      keyManagement: '',
      complianceFrameworks: [],
      securityBudget: ''
    },
    quantumAwareness: {
      awarenessLevel: '',
      timelineExpectation: '',
      primaryConcerns: [],
      hasQuantumStrategy: false
    },
    technicalReadiness: {
      cryptoInventory: false,
      legacySystems: '',
      migrationCapability: '',
      technicalExpertise: ''
    },
    riskAssessment: {
      dataClassification: [],
      threatModel: '',
      businessImpact: '',
      regulatoryRequirements: []
    }
  })

  const steps: WizardStep[] = [
    {
      id: 'organization',
      title: 'Organization Information',
      description: 'Tell us about your organization',
      completed: false
    },
    {
      id: 'current-security',
      title: 'Current Security Posture',
      description: 'Assess your existing security infrastructure',
      completed: false
    },
    {
      id: 'quantum-awareness',
      title: 'Quantum Awareness',
      description: 'Evaluate your quantum computing knowledge',
      completed: false
    },
    {
      id: 'technical-readiness',
      title: 'Technical Readiness',
      description: 'Review your technical capabilities',
      completed: false
    },
    {
      id: 'risk-assessment',
      title: 'Risk Assessment',
      description: 'Identify and prioritize quantum risks',
      completed: false
    }
  ]

  const updateAssessmentData = useCallback((section: keyof AssessmentData, field: string, value: any) => {
    setAssessmentData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }, [])

  const handleArrayToggle = useCallback((section: keyof AssessmentData, field: string, value: string) => {
    setAssessmentData(prev => {
      const currentArray = (prev[section] as any)[field] || []
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item: string) => item !== value)
        : [...currentArray, value]
      
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray
        }
      }
    })
  }, [])

  const calculateReadinessScore = useCallback(() => {
    let score = 0
    const maxScore = 100

    // Organization maturity (10 points)
    if (assessmentData.organizationInfo.name) score += 2
    if (assessmentData.organizationInfo.industry) score += 2
    if (assessmentData.organizationInfo.size) score += 3
    if (assessmentData.organizationInfo.region) score += 3

    // Current security posture (25 points)
    score += Math.min(assessmentData.currentSecurity.encryptionMethods.length * 3, 12)
    if (assessmentData.currentSecurity.keyManagement === 'hsm' || assessmentData.currentSecurity.keyManagement === 'cloud-hsm') score += 8
    else if (assessmentData.currentSecurity.keyManagement === 'software') score += 3
    score += Math.min(assessmentData.currentSecurity.complianceFrameworks.length * 2, 5)

    // Quantum awareness (20 points)
    if (assessmentData.quantumAwareness.awarenessLevel === 'expert') score += 8
    else if (assessmentData.quantumAwareness.awarenessLevel === 'intermediate') score += 5
    else if (assessmentData.quantumAwareness.awarenessLevel === 'basic') score += 2

    if (assessmentData.quantumAwareness.timelineExpectation === '1-3-years') score += 6
    else if (assessmentData.quantumAwareness.timelineExpectation === '3-5-years') score += 4
    else if (assessmentData.quantumAwareness.timelineExpectation === '5-10-years') score += 2

    if (assessmentData.quantumAwareness.hasQuantumStrategy) score += 6

    // Technical readiness (25 points)
    if (assessmentData.technicalReadiness.cryptoInventory) score += 8
    
    if (assessmentData.technicalReadiness.migrationCapability === 'high') score += 8
    else if (assessmentData.technicalReadiness.migrationCapability === 'medium') score += 5
    else if (assessmentData.technicalReadiness.migrationCapability === 'low') score += 2

    if (assessmentData.technicalReadiness.technicalExpertise === 'expert') score += 6
    else if (assessmentData.technicalReadiness.technicalExpertise === 'intermediate') score += 4
    else if (assessmentData.technicalReadiness.technicalExpertise === 'basic') score += 2

    if (assessmentData.technicalReadiness.legacySystems === 'minimal') score += 3
    else if (assessmentData.technicalReadiness.legacySystems === 'moderate') score += 2
    else if (assessmentData.technicalReadiness.legacySystems === 'extensive') score += 1

    // Risk assessment (20 points)
    score += Math.min(assessmentData.riskAssessment.dataClassification.length * 3, 9)
    
    if (assessmentData.riskAssessment.businessImpact === 'critical') score += 5
    else if (assessmentData.riskAssessment.businessImpact === 'high') score += 4
    else if (assessmentData.riskAssessment.businessImpact === 'medium') score += 3

    score += Math.min(assessmentData.riskAssessment.regulatoryRequirements.length * 2, 6)

    return Math.min(score, maxScore)
  }, [assessmentData])

  const generateRecommendations = useCallback(() => {
    const recommendations: string[] = []
    const score = calculateReadinessScore()

    if (score < 30) {
      recommendations.push('Begin with quantum awareness training for leadership and technical teams')
      recommendations.push('Conduct a comprehensive cryptographic inventory of all systems')
      recommendations.push('Establish a quantum security working group')
      recommendations.push('Develop a 3-5 year quantum readiness roadmap')
    } else if (score < 60) {
      recommendations.push('Implement crypto-agility in new system designs')
      recommendations.push('Begin pilot testing of post-quantum cryptographic algorithms')
      recommendations.push('Enhance key management infrastructure with quantum-safe practices')
      recommendations.push('Establish partnerships with quantum security vendors')
    } else if (score < 80) {
      recommendations.push('Accelerate migration to post-quantum cryptography for critical systems')
      recommendations.push('Implement hybrid classical-quantum security architectures')
      recommendations.push('Develop quantum-safe incident response procedures')
      recommendations.push('Consider quantum key distribution for high-value communications')
    } else {
      recommendations.push('Lead industry initiatives in quantum security standards')
      recommendations.push('Implement advanced quantum threat detection capabilities')
      recommendations.push('Develop quantum-safe supply chain security measures')
      recommendations.push('Consider quantum computing applications for security analytics')
    }

    // Add specific recommendations based on assessment data
    if (!assessmentData.technicalReadiness.cryptoInventory) {
      recommendations.push('Priority: Complete cryptographic inventory and dependency mapping')
    }

    if (assessmentData.quantumAwareness.awarenessLevel === 'none' || assessmentData.quantumAwareness.awarenessLevel === 'basic') {
      recommendations.push('Invest in quantum security education and training programs')
    }

    if (assessmentData.technicalReadiness.legacySystems === 'extensive') {
      recommendations.push('Develop legacy system modernization strategy with quantum-safe migration path')
    }

    return recommendations
  }, [assessmentData, calculateReadinessScore])

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Complete assessment
      const score = calculateReadinessScore()
      const recommendations = generateRecommendations()
      
      onComplete?.({
        ...assessmentData,
        score,
        recommendations
      })
    }
  }, [currentStep, steps.length, assessmentData, calculateReadinessScore, generateRecommendations, onComplete])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Organization Information
        return (
          <div className="space-y-4">
            <Input
              label="Organization Name"
              value={assessmentData.organizationInfo.name}
              onChange={(e) => updateAssessmentData('organizationInfo', 'name', e.target.value)}
              placeholder="Enter your organization name"
            />
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Industry</label>
              <select
                value={assessmentData.organizationInfo.industry}
                onChange={(e) => updateAssessmentData('organizationInfo', 'industry', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select industry</option>
                <option value="financial">Financial Services</option>
                <option value="healthcare">Healthcare</option>
                <option value="government">Government</option>
                <option value="technology">Technology</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="energy">Energy & Utilities</option>
                <option value="retail">Retail</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Organization Size</label>
              <select
                value={assessmentData.organizationInfo.size}
                onChange={(e) => updateAssessmentData('organizationInfo', 'size', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select size</option>
                <option value="startup">Startup (1-50 employees)</option>
                <option value="small">Small (51-250 employees)</option>
                <option value="medium">Medium (251-1000 employees)</option>
                <option value="large">Large (1001-5000 employees)</option>
                <option value="enterprise">Enterprise (5000+ employees)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Primary Region</label>
              <select
                value={assessmentData.organizationInfo.region}
                onChange={(e) => updateAssessmentData('organizationInfo', 'region', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select region</option>
                <option value="north-america">North America</option>
                <option value="europe">Europe</option>
                <option value="asia-pacific">Asia Pacific</option>
                <option value="latin-america">Latin America</option>
                <option value="middle-east-africa">Middle East & Africa</option>
              </select>
            </div>
          </div>
        )

      case 1: // Current Security Posture
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Current Encryption Methods (select all that apply)</label>
              <div className="space-y-2">
                {['AES', 'RSA', 'ECC', 'TLS/SSL', 'IPSec', 'PGP/GPG', 'Other'].map(method => (
                  <label key={method} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={assessmentData.currentSecurity.encryptionMethods.includes(method)}
                      onChange={() => handleArrayToggle('currentSecurity', 'encryptionMethods', method)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Key Management Approach</label>
              <select
                value={assessmentData.currentSecurity.keyManagement}
                onChange={(e) => updateAssessmentData('currentSecurity', 'keyManagement', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select approach</option>
                <option value="manual">Manual Key Management</option>
                <option value="software">Software-based KMS</option>
                <option value="hsm">Hardware Security Modules (HSM)</option>
                <option value="cloud-hsm">Cloud HSM</option>
                <option value="kms-service">Managed KMS Service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Compliance Frameworks (select all that apply)</label>
              <div className="space-y-2">
                {['NIST', 'ISO 27001', 'PCI DSS', 'HIPAA', 'SOC 2', 'GDPR', 'FedRAMP'].map(framework => (
                  <label key={framework} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={assessmentData.currentSecurity.complianceFrameworks.includes(framework)}
                      onChange={() => handleArrayToggle('currentSecurity', 'complianceFrameworks', framework)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">{framework}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Annual Security Budget</label>
              <select
                value={assessmentData.currentSecurity.securityBudget}
                onChange={(e) => updateAssessmentData('currentSecurity', 'securityBudget', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select range</option>
                <option value="under-100k">Under $100K</option>
                <option value="100k-500k">$100K - $500K</option>
                <option value="500k-1m">$500K - $1M</option>
                <option value="1m-5m">$1M - $5M</option>
                <option value="over-5m">Over $5M</option>
              </select>
            </div>
          </div>
        )

      case 2: // Quantum Awareness
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Quantum Computing Awareness Level</label>
              <select
                value={assessmentData.quantumAwareness.awarenessLevel}
                onChange={(e) => updateAssessmentData('quantumAwareness', 'awarenessLevel', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select level</option>
                <option value="none">No awareness</option>
                <option value="basic">Basic understanding</option>
                <option value="intermediate">Intermediate knowledge</option>
                <option value="advanced">Advanced understanding</option>
                <option value="expert">Expert level</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Expected Timeline for Quantum Threat</label>
              <select
                value={assessmentData.quantumAwareness.timelineExpectation}
                onChange={(e) => updateAssessmentData('quantumAwareness', 'timelineExpectation', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select timeline</option>
                <option value="1-3-years">1-3 years</option>
                <option value="3-5-years">3-5 years</option>
                <option value="5-10-years">5-10 years</option>
                <option value="10-plus-years">10+ years</option>
                <option value="uncertain">Uncertain</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Primary Quantum Security Concerns (select all that apply)</label>
              <div className="space-y-2">
                {[
                  'Data encryption vulnerability',
                  'Digital signature compromise',
                  'Key exchange security',
                  'Legacy system compatibility',
                  'Compliance requirements',
                  'Cost of migration',
                  'Technical complexity'
                ].map(concern => (
                  <label key={concern} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={assessmentData.quantumAwareness.primaryConcerns.includes(concern)}
                      onChange={() => handleArrayToggle('quantumAwareness', 'primaryConcerns', concern)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">{concern}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={assessmentData.quantumAwareness.hasQuantumStrategy}
                  onChange={(e) => updateAssessmentData('quantumAwareness', 'hasQuantumStrategy', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-foreground">We have a formal quantum security strategy</span>
              </label>
            </div>
          </div>
        )

      case 3: // Technical Readiness
        return (
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={assessmentData.technicalReadiness.cryptoInventory}
                  onChange={(e) => updateAssessmentData('technicalReadiness', 'cryptoInventory', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-foreground">We have completed a cryptographic inventory</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Legacy System Dependency</label>
              <select
                value={assessmentData.technicalReadiness.legacySystems}
                onChange={(e) => updateAssessmentData('technicalReadiness', 'legacySystems', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select level</option>
                <option value="minimal">Minimal legacy systems</option>
                <option value="moderate">Moderate legacy dependency</option>
                <option value="extensive">Extensive legacy systems</option>
                <option value="critical">Critical legacy dependency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Migration Capability</label>
              <select
                value={assessmentData.technicalReadiness.migrationCapability}
                onChange={(e) => updateAssessmentData('technicalReadiness', 'migrationCapability', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select capability</option>
                <option value="low">Low - Limited resources/expertise</option>
                <option value="medium">Medium - Some capability with external help</option>
                <option value="high">High - Strong internal capability</option>
                <option value="expert">Expert - Leading-edge capability</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Technical Expertise Level</label>
              <select
                value={assessmentData.technicalReadiness.technicalExpertise}
                onChange={(e) => updateAssessmentData('technicalReadiness', 'technicalExpertise', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select level</option>
                <option value="basic">Basic - General IT knowledge</option>
                <option value="intermediate">Intermediate - Some cryptography experience</option>
                <option value="advanced">Advanced - Strong cryptography background</option>
                <option value="expert">Expert - Quantum cryptography specialists</option>
              </select>
            </div>
          </div>
        )

      case 4: // Risk Assessment
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Data Classification Levels (select all that apply)</label>
              <div className="space-y-2">
                {['Public', 'Internal', 'Confidential', 'Restricted', 'Top Secret'].map(level => (
                  <label key={level} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={assessmentData.riskAssessment.dataClassification.includes(level)}
                      onChange={() => handleArrayToggle('riskAssessment', 'dataClassification', level)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">{level}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Primary Threat Model</label>
              <select
                value={assessmentData.riskAssessment.threatModel}
                onChange={(e) => updateAssessmentData('riskAssessment', 'threatModel', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select model</option>
                <option value="nation-state">Nation-state actors</option>
                <option value="organized-crime">Organized cybercrime</option>
                <option value="insider-threat">Insider threats</option>
                <option value="opportunistic">Opportunistic attackers</option>
                <option value="comprehensive">Comprehensive threat model</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Business Impact of Cryptographic Failure</label>
              <select
                value={assessmentData.riskAssessment.businessImpact}
                onChange={(e) => updateAssessmentData('riskAssessment', 'businessImpact', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select impact</option>
                <option value="low">Low - Minimal business disruption</option>
                <option value="medium">Medium - Significant operational impact</option>
                <option value="high">High - Major business disruption</option>
                <option value="critical">Critical - Existential threat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Regulatory Requirements (select all that apply)</label>
              <div className="space-y-2">
                {['FIPS 140-2', 'Common Criteria', 'NIST Post-Quantum', 'Industry Standards', 'Government Mandates', 'International Standards'].map(req => (
                  <label key={req} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={assessmentData.riskAssessment.regulatoryRequirements.includes(req)}
                      onChange={() => handleArrayToggle('riskAssessment', 'regulatoryRequirements', req)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">{req}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Quantum Readiness Assessment</h2>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStep 
                    ? 'bg-green-500 text-white' 
                    : index === currentStep 
                      ? 'bg-primary text-white' 
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 ${
                    index < currentStep ? 'bg-green-500' : 'bg-muted'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <p className="text-muted-foreground">{steps[currentStep].description}</p>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        
        <Button onClick={handleNext}>
          {currentStep === steps.length - 1 ? 'Complete Assessment' : 'Next'}
        </Button>
      </div>
    </div>
  )
}
