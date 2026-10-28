<?php

namespace App\Domain\Demo\Data;

use Illuminate\Support\Str;

/**
 * Region-appropriate people data. Realistic names, phone numbers and addresses
 * so a demo workspace never reads like "User XYZ" — Bangladeshi for BDT
 * tenants, general international elsewhere.
 */
class NamePool
{
    public function __construct(protected string $locale) {}

    /** @var list<string> */
    protected const BD_FIRST = [
        'Rafiqul', 'Shahriar', 'Tanvir', 'Imran', 'Mehedi', 'Farhan', 'Arif', 'Nayeem',
        'Sazzad', 'Ashraful', 'Jubayer', 'Tuhin', 'Mizanur', 'Sabrina', 'Ayesha', 'Nusrat',
        'Farhana', 'Rubaiya', 'Sharmin', 'Tania', 'Mahfuza', 'Sumaiya', 'Rehana', 'Jannatul',
        'Kamrul', 'Nazmul', 'Sabbir', 'Fahmida', 'Runa', 'Shafiq',
    ];

    /** @var list<string> */
    protected const BD_LAST = [
        'Ahmed', 'Hossain', 'Rahman', 'Chowdhury', 'Islam', 'Karim', 'Sarker', 'Uddin',
        'Alam', 'Molla', 'Bhuiyan', 'Talukder', 'Sheikh', 'Mahmud', 'Haque', 'Chowdhury',
    ];

    /** @var list<string> */
    protected const INTL_FIRST = [
        'Marcus', 'Daniel', 'Luca', 'James', 'Ethan', 'Oliver', 'Adrian', 'Miguel',
        'Tomas', 'Elena', 'Sofia', 'Chloe', 'Amara', 'Priya', 'Anna', 'Marta',
        'Nadia', 'Grace', 'Leila', 'Noah', 'Felix', 'Isabel', 'Hannah', 'Omar',
        'Liam', 'Sara', 'Nina', 'Andre',
    ];

    /** @var list<string> */
    protected const INTL_LAST = [
        'Bennett', 'Rodriguez', 'Okafor', 'Nair', 'Moretti', 'Marchetti', 'Whitfield',
        'Nkosi', 'Fischer', 'Larsen', 'Novak', 'Silva', 'Hoffmann', 'Doyle',
        'Kaur', 'Rossi', 'Bianchi', 'Keller', 'Ibrahim', 'Mensah',
    ];

    /** @var list<string> */
    protected const BD_AREAS = [
        'Dhanmondi', 'Gulshan', 'Banani', 'Uttara', 'Mohammadpur', 'Mirpur', 'Bashundhara', 'Wari',
    ];

    /** @var list<string> */
    protected const INTL_STREETS = [
        'Maple Street', 'Cedar Avenue', 'Harbour Road', 'King Street', 'Elm Grove',
        'Station Road', 'Mill Lane', 'Victoria Road', 'Oak Terrace', 'Church Street',
    ];

    /** @var list<string> */
    protected const INTL_CITIES = ['Springfield', 'Riverside', 'Fairview', 'Kingsport', 'Westfield'];

    /** @var list<string> */
    protected const BD_CITIES = ['Dhaka', 'Chattogram', 'Sylhet'];

    /** @var list<string> */
    protected const BD_DELIVERY_NOTES = [
        'Near the school gate, call on arrival',
        'Apartment 4B, second floor',
        'Opposite the pharmacy',
        'Office reception, ask for the manager',
        'Leave with the security desk',
    ];

    /** @var list<string> */
    protected const INTL_DELIVERY_NOTES = [
        'Ring the top bell, second floor',
        'Leave at the front desk',
        'Blue door next to the bakery',
        'Call when you arrive, gate code 4417',
        'Office reception on the ground floor',
    ];

    public function isBangladeshi(): bool
    {
        return $this->locale === 'bd';
    }

    public function first(DemoRandom $random): string
    {
        return $random->pick($this->isBangladeshi() ? self::BD_FIRST : self::INTL_FIRST);
    }

    public function last(DemoRandom $random): string
    {
        return $random->pick($this->isBangladeshi() ? self::BD_LAST : self::INTL_LAST);
    }

    public function person(DemoRandom $random): string
    {
        return $this->first($random).' '.$this->last($random);
    }

    /** A mobile number in the tenant's local format. */
    public function phone(DemoRandom $random): string
    {
        if ($this->isBangladeshi()) {
            return '+8801'.$random->int(3, 9).str_pad((string) $random->int(0, 99999999), 8, '0', STR_PAD_LEFT);
        }

        return '+1'.$random->int(2, 9).str_pad((string) $random->int(0, 999999999), 9, '0', STR_PAD_LEFT);
    }

    /** A clearly non-deliverable demo address (`.invalid` never resolves). */
    public function email(string $name, int $index, string $domain): string
    {
        return Str::slug($name).'.'.$index.'@'.$domain;
    }

    public function address(DemoRandom $random): string
    {
        if ($this->isBangladeshi()) {
            return sprintf(
                'House %d, Road %d, %s, %s',
                $random->int(1, 120),
                $random->int(1, 27),
                $random->pick(self::BD_AREAS),
                $random->pick(self::BD_CITIES),
            );
        }

        return sprintf('%d %s, %s', $random->int(1, 240), $random->pick(self::INTL_STREETS), $random->pick(self::INTL_CITIES));
    }

    public function city(DemoRandom $random): string
    {
        return $random->pick($this->isBangladeshi() ? self::BD_CITIES : self::INTL_CITIES);
    }

    public function deliveryNote(DemoRandom $random): string
    {
        return $random->pick($this->isBangladeshi() ? self::BD_DELIVERY_NOTES : self::INTL_DELIVERY_NOTES);
    }

    /** @return list<string> */
    public function areas(): array
    {
        return $this->isBangladeshi() ? self::BD_AREAS : self::INTL_STREETS;
    }
}
