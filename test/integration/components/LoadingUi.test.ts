import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppSpinner from '../../../src/components/ui/AppSpinner.vue'
import SkeletonLoader from '../../../src/components/ui/SkeletonLoader.vue'

describe('SkeletonLoader', () => {
  it('renderiza rows × columns blocos', () => {
    const wrapper = mount(SkeletonLoader, { props: { rows: 3, columns: 2 } })
    expect(wrapper.findAll('.skeleton-cell')).toHaveLength(6)
  })

  it('aplica tamanho e colunas configurados', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { rows: 2, columns: 1, height: '4rem', radius: '16px' }
    })
    const grid = wrapper.find('.skeleton-loader')
    expect(grid.attributes('role')).toBe('status')
    expect(grid.attributes('style')).toContain('repeat(1, 1fr)')

    const cell = wrapper.find('.skeleton-cell')
    expect(cell.attributes('style')).toContain('height: 4rem')
    expect(cell.attributes('style')).toContain('border-radius: 16px')
  })
})

describe('AppSpinner', () => {
  it('expõe status acessível para leitores de tela', () => {
    const wrapper = mount(AppSpinner, { props: { label: 'Carregando' } })
    const el = wrapper.find('.spinner')
    expect(el.attributes('role')).toBe('status')
    expect(el.attributes('aria-label')).toBe('Carregando')
  })
})
