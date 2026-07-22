import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ClickableCard from '../../../src/components/ui/ClickableCard.vue'

describe('ClickableCard', () => {
  it('emite activate no clique quando clicável', async () => {
    const wrapper = mount(ClickableCard, { props: { clickable: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('activate')).toBeTruthy()
  })

  it('emite activate ao teclar Enter', async () => {
    const wrapper = mount(ClickableCard, { props: { clickable: true } })
    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('activate')).toBeTruthy()
  })

  it('quando não clicável, não emite e não expõe role/tabindex', async () => {
    const wrapper = mount(ClickableCard, { props: { clickable: false } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('activate')).toBeUndefined()
    expect(wrapper.attributes('role')).toBeUndefined()
    expect(wrapper.attributes('tabindex')).toBeUndefined()
  })
})
