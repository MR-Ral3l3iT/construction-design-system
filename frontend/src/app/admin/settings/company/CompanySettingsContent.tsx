'use client'

import { Building2, Hash, Landmark, ListTree, Percent } from 'lucide-react'
import { Tab, TabList, TabPanel, Tabs } from '@construction/ui'
import { BankAccountsTab } from './BankAccountsTab'
import { ChartOfAccountsTab } from './ChartOfAccountsTab'
import { CompanyProfileTab } from './CompanyProfileTab'
import { DocumentSequencesTab } from './DocumentSequencesTab'
import { WhtRatesTab } from './WhtRatesTab'

export function CompanySettingsContent() {
  return (
    <Tabs defaultValue="profile">
      <TabList>
        <Tab value="profile" icon={Building2}>
          ข้อมูลบริษัท
        </Tab>
        <Tab value="bank" icon={Landmark}>
          บัญชีธนาคาร
        </Tab>
        <Tab value="accounts" icon={ListTree}>
          ผังบัญชี
        </Tab>
        <Tab value="wht" icon={Percent}>
          หัก ณ ที่จ่าย
        </Tab>
        <Tab value="sequences" icon={Hash}>
          เลขที่เอกสาร
        </Tab>
      </TabList>

      <TabPanel value="profile" className="pt-6">
        <CompanyProfileTab />
      </TabPanel>
      <TabPanel value="bank" className="pt-6">
        <BankAccountsTab />
      </TabPanel>
      <TabPanel value="accounts" className="pt-6">
        <ChartOfAccountsTab />
      </TabPanel>
      <TabPanel value="wht" className="pt-6">
        <WhtRatesTab />
      </TabPanel>
      <TabPanel value="sequences" className="pt-6">
        <DocumentSequencesTab />
      </TabPanel>
    </Tabs>
  )
}
