package com.yogesh.automation.ObjectiveProgramming;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;

public class TC03SortStringArray {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		TC03SortStringArray obj = new TC03SortStringArray();
		String[] arr = { "Sagar", "yogesh", "aai", "papa", "hashada", "vivasvan" };
		obj.sortStringArray(arr);
	}

	public void sortStringArray(String[] arr) {
		for(String e : arr) {
			System.out.print(e + "; ");
		}
		Arrays.sort(arr);
		for(String e : arr) {
			System.out.print(e + ":: ");
		}

		ArrayList<String> al = new ArrayList<>();

		// using collections
		Collections.addAll(al, arr);
		Collections.sort(al);
		System.out.println("collections sorted array  " + al);
		Iterator<String> itr = al.iterator();
		while (itr.hasNext()) {
			System.out.println(itr.next());
		}
		System.out.println("collections max           " + Collections.max(al));
		System.out.println("collections min           " + Collections.min(al));

		// using stream
		al.stream().sorted().forEach(System.out::println);
		String aa = al.stream().max(Comparator.comparing(String::valueOf)).get();
		System.out.println("max string is            " + aa);
		String bb = al.stream().min(Comparator.comparing(String::valueOf)).get();
		System.out.println("min string is            " + bb);
	}

}
