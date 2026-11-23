export type Artikel = {
	artikel_id: number;
	artikel_nr: string;
	artikel_name: string;
	kurzname: string | null;
	barcode: string | null;
	vk_preis: number | null;
	variabler_preis: boolean;
	sortiment: boolean;
	lieferant_name: string;
	lieferant_kurzname: string | null;
	produktgruppen_name: string;
	pfand_artikel_id: number | null;
	pfand_wert: number | null;
};

export type PositionKind =
	| 'artikel'
	| 'pfand'
	| 'rabatt'
	| 'preisanpassung'
	| 'leergut'
	| 'rueckgabe'
	| 'rechnung_rabatt'
	| 'gutschein'
	| 'anzahlung'
	| 'anzahlungsaufloesung';

export type Position = {
	ref: string;
	parent_ref: string | null;
	kind: PositionKind;
	artikel_id: number;
	artikel_name: string;
	kurzname: string | null;
	lieferant_kurzname: string | null;
	artikel_nr: string;
	stueckzahl: number;
	einzelpreis: number;
	ges_preis: number;
	mwst_satz: number;
	variabler_preis: boolean;
	rabatt_id: number | null;
	aktionsname?: string | null;
	rabatt_absolut: number | null;
	hat_rabatt: boolean;
	// client-only bookkeeping
	rabatt_spec?: RabattSpec;
	preis_override?: boolean;
};

export type RabattSpec = { art: 'relativ' | 'absolut'; wert: number };

export type MwstSumme = {
	mwst_satz: number;
	mwst_netto: number;
	mwst_betrag: number;
	brutto: number;
};

export type Summen = {
	zwischensumme: number;
	rabatte: number;
	zu_zahlen: number;
	mwst: MwstSumme[];
	rueckgeld: number | null;
};

export type Gutschein = {
	gutschein_id: number;
	gutschein_nr: number;
	datum: string;
	restbetrag: number;
	restbetrag_anfang: number | null;
};

export type Verkauf = {
	rechnungs_nr: number;
	verkaufsdatum: string;
	change: number | null;
	ec_warning: string | null;
};

export type VerkaufUebersicht = {
	rechnungs_nr: number;
	verkaufsdatum: string;
	summe: number;
	mwst_7: number;
	mwst_19: number;
	ec_zahlung: boolean;
	kunde_gibt: number | null;
	storno_von: number | null;
	user_id: number | null;
	username: string | null;
};

export type VerkaufDetail = {
	vd_id: number;
	position: number | null;
	stueckzahl: number;
	ges_preis: number;
	mwst_satz: number;
	rechnungs_nr: number;
	artikel_id: number | null;
	rabatt_id: number | null;
	artikel_name: string | null;
	artikel_kurzname: string | null;
	artikel_nr: string | null;
	lieferant_kurzname: string | null;
	artikel_vk_preis: number | null;
	artikel_variabler_preis: boolean;
	ist_pfand: boolean;
	aktionsname: string | null;
	gutschein_nr: number | null;
};

export type VerkaufMwst = {
	mwst_satz: number;
	mwst_netto: number;
	mwst_betrag: number;
};

export type VerkaufDetails = {
	rechnungs_nr: number;
	verkaufsdatum: string;
	ec_zahlung: boolean;
	kunde_gibt: number | null;
	storno_von: number | null;
	verkauf_details: VerkaufDetail[];
	verkauf_mwst: VerkaufMwst[];
};

export type AbrechnungMwst = {
	mwst_satz: number;
	mwst_netto: number;
	mwst_betrag: number;
	bar_brutto: number;
};

export type AbrechnungTag = {
	id: number;
	z_kasse_id: string;
	zeitpunkt: string;
	zeitpunkt_real: string;
	kassenstand_id: number | null;
	user_id: number | null;
	rechnungs_nr_von: number;
	rechnungs_nr_bis: number;
	last_tse_sig_counter: number | null;
	mwst: AbrechnungMwst[];
};

export type AbrechnungMonat = {
	id: number;
	monat: string;
	abrechnung_tag_id_von: number;
	abrechnung_tag_id_bis: number;
	mwst: AbrechnungMwst[];
};

export type AbrechnungJahr = {
	id: number;
	jahr: number;
	abrechnung_tag_id_von: number;
	abrechnung_tag_id_bis: number;
	mwst: AbrechnungMwst[];
};

export type AbrechnungVorschau = {
	open: boolean;
	rechnungs_nr_von: number | null;
	rechnungs_nr_bis: number | null;
	sales: number;
	cash_sales: number;
	ec_sales: number;
	stornos: number;
	storno_summe: number;
	retouren_summe: number;
	mwst: AbrechnungMwst[];
	current_balance: number;
	entnahmen: number;
	expected_balance: number;
};
