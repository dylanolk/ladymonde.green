export type FeaturesParams = {
    h_dropping?: boolean
    consonant_reduction?: boolean
    bleed_plosives?: boolean
    bleed_gutterals?: boolean
    bleed_s_z?: boolean
    bleed_vowels?: boolean
    bleed_unstressed_vowels?: boolean
    bleed_t_d?: boolean
    bleed_dh_t?: boolean
    bleed_ch_j?: boolean
}

export type MondegreenRequest = {
    phrase: string
    settings?: {
        exclude_words?: string[]
        include_words?: string[]
        minimum_word_commonality?: number
        features_params?: FeaturesParams
    }
}
