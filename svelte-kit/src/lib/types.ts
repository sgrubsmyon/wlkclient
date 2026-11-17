export type Artikel = {
	artikel_id: number;
	artikel_nr: string;
	artikel_name: string;
	kurzname: string | null;
	barcode: string | null;
	vk_preis: number | null;
	variabler_preis: boolean;
	lieferant_name: string;
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
