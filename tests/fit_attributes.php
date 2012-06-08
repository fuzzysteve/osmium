<?php
/* Osmium
 * Copyright (C) 2012 Romain "Artefact2" Dalmaso <artefact2@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

require_once __DIR__.'/../inc/root.php';

class FitAttributes extends PHPUnit_Framework_TestCase {
	private function assertExplosiveResistance(&$fit, $resist) {
		$this->assertEquals(
			$resist,
			1 - \Osmium\Dogma\get_ship_attribute($fit, 'armorExplosiveDamageResonance'),
			'', 0.001
			);
	}

	private function assertCapacitorStatus(&$fit, $rate, $stable, $value) {
		list($c, $s, $d) = \Osmium\Fit\get_capacitor_stability($fit);
		$this->assertSame($stable, $s);
		$this->assertEquals($rate, 1000 * $c, '', 0.1); /* 0.1 GJ/s margin (Pyfa rounding) */
		$this->assertEquals($value, $d, '', 0.1 * $value); /* 10% margin */
		
	}

	private function assertShieldResistances(&$fit, $em, $thermal, $kinetic, $explosive) {
		$this->assertEquals(
			$em,
			1 - \Osmium\Dogma\get_ship_attribute($fit, 'shieldEmDamageResonance'),
			'', 0.001
			);	
		$this->assertEquals(
			$thermal,
			1 - \Osmium\Dogma\get_ship_attribute($fit, 'shieldThermalDamageResonance'),
			'', 0.001
			);	
		$this->assertEquals(
			$kinetic,
			1 - \Osmium\Dogma\get_ship_attribute($fit, 'shieldKineticDamageResonance'),
			'', 0.001
			);	
		$this->assertEquals(
			$explosive,
			1 - \Osmium\Dogma\get_ship_attribute($fit, 'shieldExplosiveDamageResonance'),
			'', 0.001
			);		
	}

	/**
	 * @group fit
	 * @group engine
	 */
	public function testStackingPenalties() {
		static $eanm = 14950; /* Fancy EANM */

		\Osmium\Fit\create($fit);
		\Osmium\Fit\select_ship($fit, 24692); /* Abaddon */
		
		/* Numbers below extracted from Pyfa 1.1.7-git, rounded to .1% (0.001) */

		/* Base resist (with ship bonus) */
		$this->assertExplosiveResistance($fit, 0.4000);

		/* Fit one EANM II */
		\Osmium\Fit\add_module($fit, 0, $eanm);
		$this->assertExplosiveResistance($fit, 0.6269);

		/* Add a second one */
		\Osmium\Fit\add_module($fit, 1, $eanm);
		$this->assertExplosiveResistance($fit, 0.7495);

		/* Etc. */
		\Osmium\Fit\add_module($fit, 2, $eanm);
		$this->assertExplosiveResistance($fit, 0.8035);

		\Osmium\Fit\add_module($fit, 3, $eanm);
		$this->assertExplosiveResistance($fit, 0.8246);

		\Osmium\Fit\add_module($fit, 4, $eanm);
		$this->assertExplosiveResistance($fit, 0.8316);

		\Osmium\Fit\add_module($fit, 5, $eanm);
		$this->assertExplosiveResistance($fit, 0.8335);

		/* Now add a Damage Control, its bonuses should not be
		 * penalized by the EANMs since their modifiers are not in the
		 * same category (premul/postpercent) */
		\Osmium\Fit\add_module($fit, 6, 2048);
		$this->assertExplosiveResistance($fit, 0.8585);

		\Osmium\Fit\destroy($fit);
	}

	/**
	 * @group fit
	 * @group engine
	 */
	public function testReactiveArmorHardenerStackingPenalties() {
		/* The Reactive Armor Hardener is penalized by Damage
		 * Controls, but not by regular hardeners. */

		/* Numbers below extracted from Pyfa 1.1.7-git, rounded to .1% (0.001) */

		\Osmium\Fit\create($fit);
		\Osmium\Fit\select_ship($fit, 24692); /* Abaddon */

		\Osmium\Fit\add_module($fit, 0, 11646); /* Armor Explosive Hardener II */
		\Osmium\Fit\add_module($fit, 2, 11269); /* EANM II */
		\Osmium\Fit\add_module($fit, 3, 11269);
		$this->assertExplosiveResistance($fit, 0.8188);

		\Osmium\Fit\add_module($fit, 4, 2048); /* DC II */
		$this->assertExplosiveResistance($fit, 0.846);

		\Osmium\Fit\change_module_state($fit, 4, 2048, \Osmium\Fit\STATE_ONLINE);
		\Osmium\Fit\add_module($fit, 5, 4403); /* Reactive Armor Hardener */
		$this->assertExplosiveResistance($fit, 0.846);

		/* Assert penalized resist */
		\Osmium\Fit\remove_module($fit, 0, 11646);
		\Osmium\Fit\remove_module($fit, 2, 11269);
		\Osmium\Fit\remove_module($fit, 3, 11269);
		\Osmium\Fit\change_module_state($fit, 4, 2048, \Osmium\Fit\STATE_ACTIVE);
		$this->assertExplosiveResistance($fit, 0.5565);
		
		\Osmium\Fit\destroy($fit);
	}

	/**
	 * @group fit
	 * @group engine
	 */
	public function testCapacitorStability() {
		\Osmium\Fit\create($fit);
		\Osmium\Fit\select_ship($fit, 11978); /* Scimitar */
		/* Large S95a Partial Shield Transporter */
		\Osmium\Fit\add_module($fit, 0, 8641);
		\Osmium\Fit\add_module($fit, 1, 8641);
		\Osmium\Fit\add_module($fit, 2, 8641);
		\Osmium\Fit\add_module($fit, 3, 8641);

		/* Pyfa 1.1.7-git. Its estimates for duration are slightly off
		 * compared to in-game results, but I cannot test these here
		 * (ideally someone with all cap-related skills to V
		 * (including cap reduction usage skills) should go to Sisi to
		 * provide test data). */
		$this->assertCapacitorStatus($fit, 42 - 18.7, false, 52);

		\Osmium\Fit\add_module($fit, 0, 31372); /* Medium CCC */
		$this->assertCapacitorStatus($fit, 42 - 22, false, 58);

		\Osmium\Fit\add_module($fit, 1, 31372);
		$this->assertCapacitorStatus($fit, 42 - 25.9, false, 1 * 60 + 7);

		\Osmium\Fit\add_module($fit, 0, 2032); /* Cap Recharger II */
		$this->assertCapacitorStatus($fit, 42 - 32.3, false, 1 * 60 + 32);

		\Osmium\Fit\add_module($fit, 1, 2032);
		$this->assertCapacitorStatus($fit, 42 - 40.4, false, 4 * 60 + 23);

		\Osmium\Fit\add_module($fit, 2, 2032);
		$this->assertCapacitorStatus($fit, 42 - 50.5, true, 49.8);

		\Osmium\Fit\add_module($fit, 3, 2032);
		$this->assertCapacitorStatus($fit, 42 - 63.1, true, 62.3);

		\Osmium\Fit\add_module($fit, 4, 2032);
		$this->assertCapacitorStatus($fit, 42 - 78.9, true, 70.9);

		\Osmium\Fit\add_module($fit, 0, 1447); /* Capacitor Power Relay II */
		$this->assertCapacitorStatus($fit, 42 - 103.8, true, 78.4);

		\Osmium\Fit\add_module($fit, 1, 1447);
		$this->assertCapacitorStatus($fit, 42 - 136.6, true, 83.9);

		\Osmium\Fit\add_module($fit, 2, 1447);
		$this->assertCapacitorStatus($fit, 42 - 179.8, true, 87.9);

		\Osmium\Fit\add_module($fit, 3, 1447);
		$this->assertCapacitorStatus($fit, 42 - 236.6, true, 90.8);

		\Osmium\Fit\change_module_state($fit, 0, 8641, \Osmium\Fit\STATE_ONLINE);
		$this->assertCapacitorStatus($fit, 31.5 - 236.6, true, 93.1);

		\Osmium\Fit\change_module_state($fit, 1, 8641, \Osmium\Fit\STATE_ONLINE);
		$this->assertCapacitorStatus($fit, 21 - 236.6, true, 95.3);

		\Osmium\Fit\change_module_state($fit, 2, 8641, \Osmium\Fit\STATE_ONLINE);
		$this->assertCapacitorStatus($fit, 10.5 - 236.6, true, 97.4);

		\Osmium\Fit\change_module_state($fit, 3, 8641, \Osmium\Fit\STATE_ONLINE);
		$this->assertCapacitorStatus($fit, -236.6, true, 100);
	}

	/**
	 * @group fit
	 * @group engine
	 */
	public function testCapacitorStabilityWithCapBooster() {
		\Osmium\Fit\create($fit);
		\Osmium\Fit\select_ship($fit, 24692); /* Abaddon */
		\Osmium\Fit\add_modules_batch(
			$fit,
			array(
				/* Full rack of Mega Pulse Laser IIs */
				'high' => array(
					0 => 3057,
					1 => 3057,
					2 => 3057,
					3 => 3057,
					4 => 3057,
					5 => 3057,
					6 => 3057,
					7 => 3057,
					),
				)
			);
		\Osmium\Fit\add_charges_batch(
			$fit, 'foo',
			array(
				/* Multifrequency L */
				'high' => array(
					0 => 262,
					1 => 262,
					2 => 262,
					3 => 262,
					4 => 262,
					5 => 262,
					6 => 262,
					7 => 262,
					),
				)
			);

		$this->assertCapacitorStatus($fit, 42.3 - 21.3, false, 4 * 60 + 55);

		/* Heavy Capacitor Booster II, with 800 charges */
		\Osmium\Fit\add_module($fit, 0, 3578);
		\Osmium\Fit\add_charge($fit, 'foo', 'medium', 0, 11289);

		\Osmium\Fit\use_preset($fit, 'foo');
		/* Only "really" test for cap stability */
		$this->assertCapacitorStatus($fit, -45.6, true, 100.0);
	}

	/**
	 * @group fit
	 * @group engine
	 */
	public function testInvulnerabilityFieldPassiveAndActiveBonus() {
		\Osmium\Fit\create($fit);
		\Osmium\Fit\select_ship($fit, 28710); /* Golem */
		\Osmium\Fit\add_module($fit, 0, 4347); /* Pithum A-Type Invulnerability Field */

		/* Pyfa 1.1.7-git */

		\Osmium\Fit\change_module_state($fit, 0, 4347, \Osmium\Fit\STATE_OFFLINE);
		$this->assertShieldResistances($fit, 0.000, 0.400, 0.475, 0.500);

		/* Test the passive bonus */
		\Osmium\Fit\change_module_state($fit, 0, 4347, \Osmium\Fit\STATE_ONLINE);
		$this->assertShieldResistances($fit, 0.150, 0.490, 0.5538, 0.575);

		/* Test the active bonus */
		\Osmium\Fit\change_module_state($fit, 0, 4347, \Osmium\Fit\STATE_ACTIVE);
		$this->assertShieldResistances($fit, 0.4688, 0.6812, 0.7211, 0.7344);

		/* Test the active bonus when overloaded */
		\Osmium\Fit\change_module_state($fit, 0, 4347, \Osmium\Fit\STATE_OVERLOADED);
		$this->assertShieldResistances($fit, 0.5625, 0.7375, 0.7703, 0.7812);
	}
}