<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'info',
})

import ContactOutboundPanel from '~/components/contact/ContactOutboundPanel.vue'
import InfoPageSurface from '~/components/info/InfoPageSurface.vue'
import { SITE_INFORMATION } from '~/content/site-information'
import { resolveGoogleFormOutbound } from '~/utils/google-form-url'

const contact = SITE_INFORMATION.contact
const outbound = resolveGoogleFormOutbound(contact.formUrl)
</script>

<template>
  <InfoPageSurface
    page="contact"
    :eyebrow="contact.eyebrow"
    :title="contact.title"
    :lead="contact.lead"
  >
    <section
      class="mm-info-section mm-contact-section"
      data-mm-contact-section
    >
      <h2 class="mm-info-section__title">
        {{ contact.outboundHeading }}
      </h2>
      <p class="mm-info-section__body">
        {{ contact.outboundDescription }}
      </p>

      <ContactOutboundPanel
        :state="outbound"
        :link-label="contact.formLinkLabel"
        :unavailable-message="contact.unavailableMessage"
      />
    </section>

    <nav
      class="mm-info-actions"
      aria-label="문의 페이지 이동"
      data-mm-info-actions
    >
      <NuxtLink
        class="mm-info-action mm-info-action--secondary"
        to="/works"
      >
        {{ contact.worksLinkLabel }}
      </NuxtLink>
    </nav>
  </InfoPageSurface>
</template>
