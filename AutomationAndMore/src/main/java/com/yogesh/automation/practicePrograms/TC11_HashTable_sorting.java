package com.yogesh.automation.practicePrograms;

import java.util.Hashtable;
import java.util.Map;

public class TC11_HashTable_sorting {

	public static void main(String[] args) {

		Hashtable<Integer, String> table = new Hashtable<>();
		table.put(11, " Vivasvan");
		table.put(22, " John");
		table.put(33, " Yogesh");
		table.put(44, " Harshada");
		table.put(55, " Sagar");
		table.put(66, " Mike");
		table.put(77, " Tina");
		table.put(88, " Sammer");
		table.put(99, " Bob");
		table.put(100, " Bob");

		System.out.println(table);

		for (Map.Entry t : table.entrySet()) {
			System.out.println(t.getKey() + " " + t.getValue());
		}

	}

}
